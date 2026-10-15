import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { adminDb } from '@/firestore/firestoreAdmin';
import { getRequiredAdminOrTeacherSession } from '@/lib/security/serverAuth';
import { DateTime } from 'luxon';
import { readSchedule } from '@/lib/scheduling/readSchedule';
import { calculateHours, decimalHours, formatDuration } from '@/lib/scheduling/hours';
import { SYDNEY_ZONE } from '@/lib/scheduling/eventRules';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const safeName = name => String(name || 'Tutor').replace(/[^a-z0-9_.-]/gi, '_').slice(0, 100);
const renderDocx = (fileData, data) => {
    const zip = new PizZip(Buffer.from(fileData.split(',')[1], 'base64'));
    const document = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    document.render(data);
    return document.getZip().generate({ type: 'nodebuffer' });
};

export async function POST(req) {
    const { error } = await getRequiredAdminOrTeacherSession();
    if (error) return error;
    try {
        const { tutorEmail, tutorName, startDateUTC, endDateUTC, timesheetType } = await req.json();
        const start = DateTime.fromISO(startDateUTC, { zone: SYDNEY_ZONE }).startOf('day');
        const end = DateTime.fromISO(endDateUTC, { zone: SYDNEY_ZONE }).endOf('day');
        if (!start.isValid || !end.isValid || end < start || !['tutor', 'coach'].includes(timesheetType) || !tutorEmail || end.diff(start, 'days').days > 366) {
            return Response.json({ error: 'Choose a valid tutor, type and date range of up to one year.' }, { status: 400 });
        }
        const template = await adminDb.collection('timesheets').doc(tutorEmail).get();
        const fileData = template.data()?.fileData;
        if (!fileData) return Response.json({ error: 'Template missing in /users.' }, { status: 404 });
        const events = await readSchedule(adminDb, start.toJSDate(), end.plus({ milliseconds: 1 }).toJSDate());
        const category = timesheetType === 'coach' ? 'coaching' : 'work';
        const days = calculateHours(events).days.filter(day => day.email === tutorEmail.toLowerCase() && day.category === category && day.date >= start.toISODate() && day.date <= end.toISODate());
        const files = [];
        for (let week = start.startOf('week'); week <= end; week = week.plus({ weeks: 1 })) {
            const weekEnd = week.plus({ days: 6 });
            const data = { name: tutorName, role: category === 'coaching' ? 'Coach' : 'Academic Tutor', costCentre: category === 'coaching' ? '5015.3.220' : '5017.1.221', weekEnding: weekEnd.toFormat('dd/MM/yyyy') };
            let totalMs = 0;
            const warnings = [];
            DAYS.forEach((dayName, index) => {
                const date = week.plus({ days: index });
                const day = days.find(item => item.date === date.toISODate());
                const key = dayName.toLowerCase();
                data[`${key}Date`] = date >= start && date <= end ? date.toFormat('dd/MM/yyyy') : '';
                data[`${key}Commenced`] = day ? DateTime.fromJSDate(day.start, { zone: SYDNEY_ZONE }).toFormat('HH:mm') : '';
                data[`${key}Finished`] = day ? DateTime.fromJSDate(day.end, { zone: SYDNEY_ZONE }).toFormat('HH:mm') : '';
                data[`${key}Break`] = day?.deductionMs ? decimalHours(day.deductionMs) : '';
                data[`${key}Total`] = day ? `${decimalHours(day.paidMs)}${day.warnings.length ? ' ⚠' : ''}` : '';
                if (day) {
                    totalMs += day.paidMs;
                    day.warnings.forEach(warning => warnings.push(`${day.date}: ${warning.message} Counted ${formatDuration(day.paidMs)}.`));
                }
            });
            data.totalHours = decimalHours(totalMs);
            data.warnings = warnings.join('\n');
            // Existing templates have no warnings placeholder. Include a readable warning paragraph.
            const buffer = renderDocx(fileData, data);
            const zip = new PizZip(buffer);
            if (warnings.length) {
                const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const paragraphs = warnings.map(warning => `<w:p><w:r><w:t xml:space="preserve">⚠ ${escape(warning)}</w:t></w:r></w:p>`).join('');
                const xml = zip.file('word/document.xml').asText();
                zip.file('word/document.xml', xml.replace(/(<w:sectPr\b[^>]*(?:\/>|>[\s\S]*?<\/w:sectPr>))?(\s*<\/w:body>)/, (_match, finalSection = '', bodyEnd) => `${paragraphs}${finalSection}${bodyEnd}`));
            }
            files.push({ name: `${safeName(tutorName)}_${timesheetType}_${weekEnd.toISODate()}.docx`, buffer: zip.generate({ type: 'nodebuffer' }) });
        }
        const archive = new PizZip();
        files.forEach(file => archive.file(file.name, file.buffer));
        const multiple = files.length > 1;
        return new Response(multiple ? archive.generate({ type: 'nodebuffer' }) : files[0].buffer, { headers: {
            'Content-Type': multiple ? 'application/zip' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${multiple ? `${safeName(tutorName)}_${timesheetType}_timesheets.zip` : files[0].name}"`,
            'Cache-Control': 'no-store',
        } });
    } catch (error) {
        console.error('Timesheet generation failed', error);
        return Response.json({ error: 'Could not generate the timesheet. Please retry.' }, { status: 500 });
    }
}
