import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { adminDb } from '@/firestore/firestoreAdmin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/security/authConfig';
import { DateTime } from 'luxon';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const MAX_DAILY_HOURS = 8;
const MAX_WEEKLY_HOURS = 40;
const SYDNEY_ZONE = 'Australia/Sydney';

/**
 * Fetch and expand all shifts for a tutor within a date range.
 */
async function fetchUserShifts(userEmail, startDateSyd, endDateSyd, timesheetType) {

    // Syd -> UTC (firebase shifts are stored as UTC)
    const startDateUTC = startDateSyd.toJSDate();
    const endDateUTC = endDateSyd.toJSDate();

    let query = adminDb.collection('shifts');

    query = query.where('recurring', '==', null)
                 .where('workStatus', '==', 'completed');

    query = query.where('emailsList', 'array-contains', userEmail);
    if (timesheetType == "coach") {
        query = query.where('workType', '==', 'coaching');
    } else {
        query = query.where('workType', 'in', ['tutoring', 'work', 'tutoringOrWork']);
    }

    query = query.where('start', '>=', startDateUTC)
                 .where('start', '<=', endDateUTC);

    const snap = await query.get();
    console.log(`Found ${snap.docs.length} shifts for ${userEmail} (${timesheetType})`);

    const shifts = snap.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            start: DateTime.fromJSDate(data.start.toDate(), { zone: SYDNEY_ZONE }),
            end: DateTime.fromJSDate(data.end.toDate(), { zone: SYDNEY_ZONE })
        };
    });

    console.log('Shifts:', shifts.map(s => ({
        start: s.start.toISO(),
        end: s.end.toISO(),
        workType: s.workType,
        workStatus: s.workStatus
    })));

    return shifts;
}

/**
 * Fetch the uploaded timesheet template for a tutor from Firestore.
 */
async function fetchTemplate(tutorEmail) {
    const doc = await adminDb.collection('timesheets').doc(tutorEmail).get();
    if (!doc.exists) {
        return null;
    }
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
function getWeekDates(startDateSyd) {
    return DAYS_OF_WEEK.map((day, i) => {
        const dateLuxon = startDateSyd.plus({ days: i });
        return {
            day,
            dateLuxon,
            date: dateLuxon.toFormat('dd/MM/yyyy')
        };
    })
}
/**
 * Spread total hours greedily across Mon–Fri.
 * Each day gets up to MAX_DAILY_HOURS (8hrs).
 * Days with 0 allocated hours are left blank.
 */
const distributeHours = (totalHours, weekDates) => {
    const dailyAllocationObj = {};

    let totalHoursToAllocate = parseFloat(totalHours.toFixed(2));

    for (const { day, date } of weekDates) {
        if (totalHoursToAllocate <= 0) {
            break;
        }

        const hoursForThisDay = parseFloat(Math.min(totalHoursToAllocate, MAX_DAILY_HOURS).toFixed(2));
        dailyAllocationObj[day] = {
            date,
            hoursForThisDay,
        };

        totalHoursToAllocate = parseFloat((totalHoursToAllocate - hoursForThisDay).toFixed(2));
    }

    return dailyAllocationObj;
}


// 30 min break for 3-6 hours, 1 hour break for > 6 hours
const calculateBreakTime = (totalHours) => {
    if (totalHours > 3 && totalHours <= 6) {
        return 0.5;
    }
    if (totalHours > 6) {
        return 1;
    }
    return 0;
};

// adding this general function - just in case more roles get created in the future 
const generateTimeSheet = async (timesheetType, tutorEmail, tutorName, startDateSyd, endDateSyd) => {
    const fileData = await fetchTemplate(tutorEmail); 
    if (!fileData) {
        return { error: 'Template missing in /users.', status: 404 };
    } 
    
    let shifts;
    if (timesheetType == "tutor") {    
        shifts = await fetchUserShifts(tutorEmail, startDateSyd, endDateSyd, "tutor");
    } else {
        shifts = await fetchUserShifts(tutorEmail, startDateSyd, endDateSyd, "coach");
    }

    const rawTotalHours = shifts.reduce((sum, s) => {
        return sum + s.end.diff(s.start, 'hours').hours;
    }, 0);

    const TUTOR_MIN_THRESHOLD = 3;
    const COACH_MIN_THRESHOLD = 2;
    if (timesheetType == "tutor" && rawTotalHours < TUTOR_MIN_THRESHOLD) { 
        return { error: `Not enough tutor hours for ${tutorName} — minimum 3hrs required).`, status: 400 };
    } else if (timesheetType == "coach" && rawTotalHours < COACH_MIN_THRESHOLD) {
        return { error: `Not enough coach hours for ${tutorName} — minimum 2hrs required).`, status: 400 };
    }

    const overflowHours = parseFloat(Math.max(0, rawTotalHours - MAX_WEEKLY_HOURS).toFixed(2));
    const totalHours = Math.min(rawTotalHours, MAX_WEEKLY_HOURS);

    const weekDates = getWeekDates(startDateSyd);
    const weekEnding = startDateSyd.plus({ days: 6 }).toFormat('dd/MM/yyyy');
    const dailyAllocation = distributeHours(totalHours, weekDates);

    const templateData = {
        name: tutorName,
        role: timesheetType === 'coach' ? 'Coach' : 'Academic Tutor',
        weekEnding,
        totalHours: parseFloat(totalHours.toFixed(2)),
    };

    for (const { day, dateLuxon } of weekDates) {
        const key = day.toLowerCase();
        const data = dailyAllocation[day];
        let commenced = '', finished = '', breakHours = '';

        if (data) {
            const totalHours = data.hoursForThisDay;
            const breakTime = calculateBreakTime(totalHours);

            const start = dateLuxon.set({ hour: 8, minute: 0, second: 0 });
            const end = start.plus({ hours: totalHours + breakTime });

            commenced = start.toFormat('HH:mm');
            finished = end.toFormat('HH:mm');
            breakHours = breakTime || '';
        }

        templateData[`${key}Date`] = data?.date || '';
        templateData[`${key}Commenced`] = commenced;
        templateData[`${key}Finished`] = finished;
        templateData[`${key}Break`] = breakHours;

        templateData[`${key}Total`] = data ? data.hoursForThisDay.toFixed(2) : '';
    }

    const buffer = renderDocx(fileData, templateData);
    return { buffer, overflowHours };
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
        const { tutorEmail, tutorName, startDateUTC, endDateUTC, timesheetType } = await req.json();

        // Parse ISO dates and convert to Sydney time
        const startDateSyd = DateTime.fromISO(startDateUTC).setZone(SYDNEY_ZONE).startOf('day');
        const endDateSyd = DateTime.fromISO(endDateUTC).setZone(SYDNEY_ZONE).endOf('day');

        let timesheet = await generateTimeSheet(timesheetType, tutorEmail, tutorName, startDateSyd, endDateSyd);
        if (timesheet.error) {
            return new Response(JSON.stringify(timesheet.data ?? { error: timesheet.error }), { status: timesheet.status ?? 500 });
        }

        const headers = {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${tutorName}_${timesheetType}_timesheet.docx"`,
        };
        if (timesheet.overflowHours > 0) {
            headers['X-Overflow-Hours'] = String(timesheet.overflowHours);
        }

        return new Response(timesheet.buffer, { status: 200, headers });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
