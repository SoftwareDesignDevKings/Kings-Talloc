import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { adminDb } from '@/firestore/firestoreAdmin';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { recurringCalendarExpand } from '@/utils/calendarRecurringEvents';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const calculateBreakTime = (totalHours) => {
    // 30 min break for 3-6 hours, 1 hour break for > 6 hours
    if (totalHours > 3 && totalHours <= 6) return 0.5;
    if (totalHours > 6) return 1;
    return 0;
};

const isShiftValid = (shift) => {
    if (shift.createdByStudent && shift.approvalStatus !== 'approved') return false;
    return shift.workStatus === 'completed';
};

const isTutorConfirmed = (event, tutorEmail) => {
    if (!event.confirmationRequired) return true;
    return event.tutorResponses?.some((r) => r.email === tutorEmail && r.response) || false;
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const MAX_DAILY_HOURS = 8;
const MIN_THRESHOLD = 3;

/**
 * Fetch and expand all shifts for a tutor within a date range.
 */
async function fetchShiftsForTutor(tutorEmail, startDate, endDate, isCoachTimesheet) {
    const [nonRecSnap, recSnap] = await Promise.all([
        adminDb.collection('shifts').where('start', '>=', startDate).where('start', '<=', endDate).where('recurring', '==', null).get(),
        adminDb.collection('shifts').where('recurring', 'in', ['weekly', 'fortnightly']).get()
    ]);

    const rawShifts = nonRecSnap.docs.map(doc => ({
        ...doc.data(),
        start: doc.data().start.toDate(),
        end: doc.data().end.toDate()
    }));

    const recShifts = recSnap.docs.map(doc => ({
        ...doc.data(),
        start: doc.data().start.toDate(),
        end: doc.data().end.toDate(),
        ...(doc.data().until && { until: doc.data().until.toDate() })
    }));

    const expandedRec = recurringCalendarExpand(recShifts, { rangeStart: startDate, rangeEnd: endDate, maxOccurrences: 52 })
        .filter(s => s.start >= startDate && s.start <= endDate);

    return [...rawShifts, ...expandedRec].filter(shift => {
        if (!isShiftValid(shift)) return false;
        const typeMatch = isCoachTimesheet ? shift.workType === 'coaching' : shift.workType !== 'coaching';
        const isAssigned = shift.staff?.some(s => s.value === tutorEmail);
        return typeMatch && isAssigned && isTutorConfirmed(shift, tutorEmail);
    });
}

/**
 * Fetch the uploaded timesheet template for a tutor from Firestore.
 */
async function fetchTemplate(tutorEmail) {
    const doc = await adminDb.collection('timesheets').doc(tutorEmail).get();
    if (!doc.exists) return null;
    return doc.data().fileData;
}

/**
 * Render a docxtemplater document and return the buffer.
 */
function renderDocx(fileData, templateData) {
    const zip = new PizZip(Buffer.from(fileData.split(',')[1], 'base64'));
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(templateData);
    return doc.getZip().generate({ type: 'nodebuffer' });
}

// ============================================================
// TUTOR TIMESHEET — simple hour spread, no exact times
// ============================================================

/**
 * Get Mon–Fri Date objects starting from a given Monday.
 * startDate is assumed to be Monday (as sent by the UI date picker).
 */
function getWeekDates(startDate) {
    return DAYS_OF_WEEK.map((day, i) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        return { day, date: d };
    });
}

/**
 * Spread total hours greedily across Mon–Fri.
 * Each day gets up to MAX_DAILY_HOURS (8hrs).
 * Days with 0 allocated hours are left blank.
 */
function spreadHoursAcrossWeek(totalHours, weekDates) {
    const spread = {};
    let remaining = parseFloat(totalHours.toFixed(2));

    for (const { day, date } of weekDates) {
        if (remaining <= 0) break;
        const hours = parseFloat(Math.min(remaining, MAX_DAILY_HOURS).toFixed(2));
        spread[day] = {
            date: date.toLocaleDateString('en-AU', { month: '2-digit', day: '2-digit', year: 'numeric' }),
            hours,
        };
        remaining = parseFloat((remaining - hours).toFixed(2));
    }

    return spread;
}

async function generateTutorTimesheet(tutorEmail, tutorName, startDate, endDate) {
    const allShifts = await fetchShiftsForTutor(tutorEmail, startDate, endDate, false);

    const rawTotal = allShifts.reduce((sum, s) => sum + (s.end - s.start) / 3600000, 0);

    const MAX_WEEKLY_HOURS = MAX_DAILY_HOURS * DAYS_OF_WEEK.length; // 40hrs

    if (rawTotal < MIN_THRESHOLD) {
        return { error: `Not enough tutor hours for ${tutorName} in this period (${rawTotal.toFixed(2)}hrs total — minimum 3hrs required).`, status: 400 };
    }

    const overflow = parseFloat(Math.max(0, rawTotal - MAX_WEEKLY_HOURS).toFixed(2));
    const totalHours = Math.min(rawTotal, MAX_WEEKLY_HOURS);

    const weekDates = getWeekDates(startDate);

    // week ending = Sunday (ie. 6 days after Monday)
    const sunday = new Date(startDate);
    sunday.setDate(startDate.getDate() + 6);
    const weekEnding = sunday.toLocaleDateString('en-AU');

    const spread = spreadHoursAcrossWeek(totalHours, weekDates);

    const templateData = {
        name: tutorName,
        role: 'Academic Tutor',
        weekEnding,
        totalHours: parseFloat(totalHours.toFixed(2)),
    };

    for (const { day, date } of weekDates) {
        const key = day.toLowerCase();
        const data = spread[day];
        let commenced = '', finished = '', breakHours = '';

        if (data) {
            const totalHours = data.hours;
            const breakTime = calculateBreakTime(totalHours);

            const start = new Date(date);
            start.setHours(8, 0, 0, 0);
            const end = new Date(start.getTime() + (totalHours + breakTime) * 3600000);

            commenced = start.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });
            finished = end.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });
            breakHours = breakTime || '';
        }

        templateData[`${key}Date`] = data?.date || '';
        templateData[`${key}Commenced`] = commenced;
        templateData[`${key}Finished`] = finished;
        templateData[`${key}Break`] = breakHours;
        templateData[`${key}Total`] = data ? data.hours.toFixed(2) : '';
    }

    const fileData = await fetchTemplate(tutorEmail);
    if (!fileData) return { error: 'Template missing', status: 404 };

    const buffer = renderDocx(fileData, templateData);
    return { buffer, overflow };
}

// ============================================================
// COACH TIMESHEET — exact times from shift data
// ============================================================

async function generateCoachTimesheet(tutorEmail, tutorName, startDate, endDate) {
    const allShifts = await fetchShiftsForTutor(tutorEmail, startDate, endDate, true);

    const rawTotal = allShifts.reduce((sum, s) => sum + (s.end - s.start) / 3600000, 0);
    const COACH_MIN_THRESHOLD = 2;
    if (rawTotal < COACH_MIN_THRESHOLD) {
        return { error: `Not enough coaching hours for ${tutorName} in this period (${rawTotal.toFixed(2)}hrs total — minimum 2hrs required).`, status: 400 };
    }

    // Group shifts by day: track earliest start, latest end, sum of durations
    const dayData = {};
    for (const shift of allShifts) {
        const dayName = shift.start.toLocaleDateString('en-AU', { weekday: 'long' });
        const duration = (shift.end - shift.start) / 3600000;
        if (!dayData[dayName]) {
            dayData[dayName] = {
                date: shift.start.toLocaleDateString('en-AU', { month: '2-digit', day: '2-digit', year: 'numeric' }),
                earliestStart: shift.start,
                latestEnd: shift.end,
                totalDuration: 0,
            };
        }
        dayData[dayName].totalDuration += duration;
        if (shift.start < dayData[dayName].earliestStart) dayData[dayName].earliestStart = shift.start;
        if (shift.end > dayData[dayName].latestEnd) dayData[dayName].latestEnd = shift.end;
    }

    // Cap each day at MAX_DAILY_HOURS; overflow hours are reported back
    let overflow = 0;
    for (const day of Object.keys(dayData)) {
        if (dayData[day].totalDuration > MAX_DAILY_HOURS) {
            overflow += parseFloat((dayData[day].totalDuration - MAX_DAILY_HOURS).toFixed(2));
            dayData[day].totalDuration = MAX_DAILY_HOURS;
            dayData[day].latestEnd = new Date(dayData[day].earliestStart.getTime() + MAX_DAILY_HOURS * 3600000);
        }
    }
    overflow = parseFloat(overflow.toFixed(2));

    // weekEnding - sunday (ie. 6 days after Monday)
    const sunday = new Date(startDate);
    sunday.setDate(startDate.getDate() + 6);
    const weekEnding = sunday.toLocaleDateString('en-AU');

    const templateData = {
        name: tutorName,
        role: 'Coach',
        weekEnding,
        totalHours: 0,
    };

    for (const day of DAYS_OF_WEEK) {
        const data = dayData[day];
        const key = day.toLowerCase();
        templateData[`${key}Date`] = data?.date || '';
        templateData[`${key}Commenced`] = data ? data.earliestStart.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
        templateData[`${key}Finished`] = data ? data.latestEnd.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
        templateData[`${key}Break`] = data ? (calculateBreakTime(data.totalDuration) || '') : '';
        templateData[`${key}Total`] = data ? data.totalDuration.toFixed(2) : '';
        templateData.totalHours += data ? data.totalDuration : 0;
    }
    templateData.totalHours = parseFloat(templateData.totalHours).toFixed(2);

    const fileData = await fetchTemplate(tutorEmail);
    if (!fileData) return { error: 'Template missing', status: 404 };

    const buffer = renderDocx(fileData, templateData);
    return { buffer, overflow };
}

// ============================================================
// API ENDPOINT
// ============================================================

export async function POST(req) {
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.defaultRole || session?.user?.role;
    const userRoles = session?.user?.userRoles || [];

    const isAdmin = userRole === 'admin' || userRoles.includes('admin');
    if (!session || !isAdmin) {
        return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401 });
    }

    try {
        const { tutorEmail, tutorName, startDate: startDateStr, endDate: endDateStr, roleType } = await req.json();

        // Parse ISO timestamps directly - no timezone conversion needed
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        const isCoach = roleType === 'coach';

        const result = isCoach
            ? await generateCoachTimesheet(tutorEmail, tutorName, startDate, endDate)
            : await generateTutorTimesheet(tutorEmail, tutorName, startDate, endDate);

        if (result.error) {
            return new Response(JSON.stringify(result.data ?? { error: result.error }), { status: result.status ?? 500 });
        }

        const headers = {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${tutorName}_${roleType}_timesheet.docx"`,
        };
        if (result.overflow > 0) {
            headers['X-Overflow-Hours'] = String(result.overflow);
        }

        return new Response(result.buffer, { status: 200, headers });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
