import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { adminDb } from '@/firestore/firestoreAdmin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/security/authConfig';
import { DateTime } from 'luxon';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SYDNEY_ZONE = 'Australia/Sydney';
const COST_CENTRES = {
    coach: '5015.3.220',
    tutor: '5017.1.221',
};

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

/**
 * Get week Date objects starting from a given Monday.
 * startDate is assumed to be Monday (as sent by the UI date picker).
 */
function getWeekDates(startDateSyd) {
    return DAYS_OF_WEEK.map((day, i) => {
        const dateLuxon = startDateSyd.plus({ days: i });
        return {
            day,
            date: dateLuxon.toFormat('dd/MM/yyyy')
        };
    })
}

/**
 * Group completed calendar shifts by weekday while keeping their real event times.
 * Templates only have one row per weekday, so multiple shifts on the same day are
 * represented by the earliest commencement, latest finish, and summed paid hours.
 */
const buildDailyAllocation = (shifts) => {
    return [...shifts]
        .sort((a, b) => a.start.toMillis() - b.start.toMillis())
        .reduce((allocation, shift) => {
            const day = shift.start.weekdayLong;
            if (!DAYS_OF_WEEK.includes(day)) {
                return allocation;
            }

            const shiftHours = shift.end.diff(shift.start, 'hours').hours;
            const current = allocation[day];

            allocation[day] = {
                date: shift.start.toFormat('dd/MM/yyyy'),
                start: current && current.start.toMillis() < shift.start.toMillis() ? current.start : shift.start,
                end: current && current.end.toMillis() > shift.end.toMillis() ? current.end : shift.end,
                grossHours: parseFloat(((current?.grossHours || 0) + shiftHours).toFixed(2)),
            };

            return allocation;
        }, {});
};

// 30 min break for 3hrs exclusive to 6hrs inclusive, 1 hour break for over 6hrs.
const calculateBreakTime = (grossHours) => {
    if (grossHours > 6) {
        return 1;
    }
    if (grossHours > 3) {
        return 0.5;
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

    const weekDates = getWeekDates(startDateSyd);
    const weekEnding = startDateSyd.plus({ days: 6 }).toFormat('dd/MM/yyyy');
    const dailyAllocation = buildDailyAllocation(shifts);

    const templateData = {
        name: tutorName,
        role: timesheetType === 'coach' ? 'Coach' : 'Academic Tutor',
        costCentre: COST_CENTRES[timesheetType],
        weekEnding,
    };

    let grandTotalHours = 0;

    for (const { day } of weekDates) {
        const key = day.toLowerCase();
        const data = dailyAllocation[day];
        let commenced = '', finished = '', breakHours = '';
        let dayTotal = '';

        if (data) {
            const breakTime = calculateBreakTime(data.grossHours);

            commenced = data.start.toFormat('HH:mm');
            finished = data.end.toFormat('HH:mm');
            breakHours = breakTime || '';
            const paidHours = data.grossHours - breakTime;
            dayTotal = paidHours.toFixed(2);
            grandTotalHours += paidHours;
        }

        templateData[`${key}Date`] = data?.date || '';
        templateData[`${key}Commenced`] = commenced;
        templateData[`${key}Finished`] = finished;
        templateData[`${key}Break`] = breakHours;
        templateData[`${key}Total`] = dayTotal;
    }

    templateData.totalHours = parseFloat(grandTotalHours.toFixed(2));

    const buffer = renderDocx(fileData, templateData);
    return { buffer };
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
        return new Response(timesheet.buffer, { status: 200, headers });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
