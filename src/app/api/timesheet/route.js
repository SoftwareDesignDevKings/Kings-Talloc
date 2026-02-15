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

    const FRIDAY = 5;
    const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    try {
        const { tutorEmail, tutorName, startDate: startDateStr, endDate: endDateStr, roleType } = await req.json();
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        const isCoachTimesheet = roleType === 'coach';
        const roleLabel = isCoachTimesheet ? 'Coach' : 'Academic Tutor';

        // 1. Fetch & Expand Shifts
        const [nonRecSnap, recSnap] = await Promise.all([
            adminDb.collection('shifts').where('start', '>=', startDate).where('start', '<=', endDate).where('recurring', '==', null).get(),
            adminDb.collection('shifts').where('recurring', 'in', ['weekly', 'fortnightly']).get()
        ]);

        let rawShifts = nonRecSnap.docs.map(doc => ({ ...doc.data(), start: doc.data().start.toDate(), end: doc.data().end.toDate() }));
        let recShifts = recSnap.docs.map(doc => ({
            ...doc.data(),
            start: doc.data().start.toDate(),
            end: doc.data().end.toDate(),
            ...(doc.data().until && { until: doc.data().until.toDate() })
        }));

        const expandedRec = recurringCalendarExpand(recShifts, { rangeStart: startDate, rangeEnd: endDate, maxOccurrences: 52 })
            .filter(s => s.start >= startDate && s.start <= endDate);

        const allShifts = [...rawShifts, ...expandedRec].filter(shift => {
            if (!isShiftValid(shift)) return false;
            const typeMatch = isCoachTimesheet ? shift.workType === 'coaching' : shift.workType !== 'coaching';
            const isAssigned = shift.staff?.some(s => s.value === tutorEmail);
            return typeMatch && isAssigned && isTutorConfirmed(shift, tutorEmail);
        });

        // 2. Constants & Data Buckets
        const dayData = {};
        let scatteredShifts = [];
        const MIN_THRESHOLD = 3;
        const MAX_DAILY_HOURS = 8;

        // 3. PHASE 1: Initial Categorization & Handling Marathon Shifts (>8hrs)
        for (const shift of allShifts) {
            const dayName = shift.start.toLocaleDateString('en-AU', { weekday: 'long' });
            const duration = (shift.end - shift.start) / 3600000;

            if (duration > MAX_DAILY_HOURS) {
                // CASE 1: Split Marathon shift
                if (!dayData[dayName]) {
                    dayData[dayName] = {
                        date: shift.start.toLocaleDateString('en-AU', { month: '2-digit', day: '2-digit', year: 'numeric' }),
                        totalDuration: 0,
                        earliestStart: shift.start,
                        latestEnd: shift.end 
                    };
                }
                const overflowHours = duration - MAX_DAILY_HOURS;
                dayData[dayName].totalDuration += MAX_DAILY_HOURS;
                dayData[dayName].latestEnd = new Date(dayData[dayName].earliestStart.getTime() + (MAX_DAILY_HOURS * 3600000));
                
                scatteredShifts.push({ ...shift, duration: overflowHours, dayName, isOverflow: true });

            } else if (duration >= MIN_THRESHOLD) {
                // CASE 2: Standard Shift
                if (!dayData[dayName]) {
                    dayData[dayName] = {
                        date: shift.start.toLocaleDateString('en-AU', { month: '2-digit', day: '2-digit', year: 'numeric' }),
                        totalDuration: 0,
                        earliestStart: shift.start,
                        latestEnd: shift.end 
                    };
                }
                dayData[dayName].totalDuration += duration;
                if (shift.end > dayData[dayName].latestEnd) dayData[dayName].latestEnd = shift.end;

            } else {
                // CASE 3: Tiny Shifts
                scatteredShifts.push({ ...shift, duration, dayName });
            }
        }

        // 4. PHASE 2: Create Standalone Shifts on EMPTY Days First
        // This avoids unnecessary break-time penalties for aggregated tiny shifts.
        if (scatteredShifts.length > 0) {
            let totalScattered = scatteredShifts.reduce((sum, s) => sum + s.duration, 0);

            for (const dayName of DAYS_OF_WEEK) {
                if (!dayData[dayName] && totalScattered >= MIN_THRESHOLD) {
                    const refDate = scatteredShifts[0].start;
                    const amountToUse = Math.min(totalScattered, MAX_DAILY_HOURS);

                    dayData[dayName] = {
                        date: refDate.toLocaleDateString('en-AU', { month: '2-digit', day: '2-digit', year: 'numeric' }),
                        earliestStart: new Date(new Date(refDate).setHours(9, 0, 0, 0)),
                        latestEnd: new Date(new Date(refDate).setHours(9, 0, 0, 0) + (amountToUse * 3600000)),
                        totalDuration: amountToUse
                    };

                    // Clean the scattered array
                    let removedHours = 0;
                    for (let i = scatteredShifts.length - 1; i >= 0; i--) {
                        if (removedHours + scatteredShifts[i].duration <= amountToUse) {
                            removedHours += scatteredShifts[i].duration;
                            scatteredShifts.splice(i, 1);
                        }
                    }
                    totalScattered -= removedHours;
                }
            }
        }

        // 5. PHASE 3: Fill existing shifts with remaining fragments
        for (const dayName of DAYS_OF_WEEK) {
            if (dayData[dayName]) {
                for (let i = scatteredShifts.length - 1; i >= 0; i--) {
                    const overFlowShift = scatteredShifts[i];
                    const currentTotal = dayData[dayName].totalDuration;
                    
                    if (currentTotal + overFlowShift.duration <= MAX_DAILY_HOURS) {
                        dayData[dayName].totalDuration += overFlowShift.duration;
                        dayData[dayName].latestEnd = new Date(dayData[dayName].latestEnd.getTime() + (overFlowShift.duration * 3600000));
                        scatteredShifts.splice(i, 1);
                    }
                }
            }
        }

        // 6. Manual Intervention Guard
        if (scatteredShifts.length > 0) {
            const excluded = {};
            for (const s of scatteredShifts) {
                if (!excluded[s.dayName]) excluded[s.dayName] = [];
                excluded[s.dayName].push(`${s.duration.toFixed(2)} hrs ${s.isOverflow ? '(Overflow)' : ''}`);
            }
            return new Response(JSON.stringify({ 
                error: 'THRESHOLD_NOT_MET', 
                tutorName, 
                excludedShifts: excluded,
                totalExcluded: scatteredShifts.reduce((a, b) => a + b.duration, 0).toFixed(2)
            }), { status: 400 });
        }

        // 7. Word Doc Generation
        const timesheetDoc = await adminDb.collection('timesheets').doc(tutorEmail).get();
        if (!timesheetDoc.exists) return new Response(JSON.stringify({ error: 'Template missing' }), { status: 404 });

        const zip = new PizZip(Buffer.from(timesheetDoc.data().fileData.split(',')[1], 'base64'));
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        const today = new Date();
        const weekEnding = new Date(today.setDate(today.getDate() + (FRIDAY - today.getDay())));

        const templateData = {
            name: tutorName, role: roleLabel, weekEnding: weekEnding.toLocaleDateString('en-AU'),
            totalHours: 0
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

        doc.render(templateData);

        return new Response(doc.getZip().generate({ type: 'nodebuffer' }), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${tutorName}_timesheet.docx"`
            }
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}