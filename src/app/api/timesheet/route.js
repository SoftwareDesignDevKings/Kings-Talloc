import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { adminDb } from '@/firestore/firestoreAdmin';

export async function POST(req) {
    const FRIDAY = 5;
    try {
        const { tutorEmail, tutorName, hoursData, excludedHoursTotal = 0, role } = await req.json();

        // 1. Fetch template from Firestore
        const timesheetDoc = await adminDb.collection('timesheets').doc(tutorEmail).get();

        if (!timesheetDoc.exists) {
            return new Response(
                JSON.stringify({ error: 'No timesheet template found for this tutor' }),
                {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        const timesheetData = timesheetDoc.data();

        // 2. Convert base64 to buffer
        const base64Data = timesheetData.fileData.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');

        // 3. Load template with PizZip
        const zip = new PizZip(buffer);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // 4. Compute week ending (this Friday)
        const today = new Date();
        const diff = FRIDAY - today.getDay();
        const weekEnding = new Date(today);
        weekEnding.setDate(today.getDate() + diff);

        // 5. Calculate total hours (includes excluded short shifts)
        const totalHours =
            Object.values(hoursData).reduce((a, b) => a + (parseFloat(b.total) || 0), 0) +
            excludedHoursTotal;

        // 6. Prepare template data
        const templateData = {
            name: tutorName,
            role: role,
            weekEnding: weekEnding.toLocaleDateString(),
            mondayDate: hoursData.Monday?.date || '',
            mondayCommenced: hoursData.Monday?.commenced || '',
            mondayFinished: hoursData.Monday?.finished || '',
            mondayBreak: hoursData.Monday?.break || '',
            mondayTotal: hoursData.Monday?.total || '',
            tuesdayDate: hoursData.Tuesday?.date || '',
            tuesdayCommenced: hoursData.Tuesday?.commenced || '',
            tuesdayFinished: hoursData.Tuesday?.finished || '',
            tuesdayBreak: hoursData.Tuesday?.break || '',
            tuesdayTotal: hoursData.Tuesday?.total || '',
            wednesdayDate: hoursData.Wednesday?.date || '',
            wednesdayCommenced: hoursData.Wednesday?.commenced || '',
            wednesdayFinished: hoursData.Wednesday?.finished || '',
            wednesdayBreak: hoursData.Wednesday?.break || '',
            wednesdayTotal: hoursData.Wednesday?.total || '',
            thursdayDate: hoursData.Thursday?.date || '',
            thursdayCommenced: hoursData.Thursday?.commenced || '',
            thursdayFinished: hoursData.Thursday?.finished || '',
            thursdayBreak: hoursData.Thursday?.break || '',
            thursdayTotal: hoursData.Thursday?.total || '',
            fridayDate: hoursData.Friday?.date || '',
            fridayCommenced: hoursData.Friday?.commenced || '',
            fridayFinished: hoursData.Friday?.finished || '',
            fridayBreak: hoursData.Friday?.break || '',
            fridayTotal: hoursData.Friday?.total || '',
            totalHours: totalHours.toFixed(2),
        };

        // 7. Render document
        doc.render(templateData);

        // 8. Generate and return document
        const outputBuffer = doc.getZip().generate({ type: 'nodebuffer' });

        return new Response(outputBuffer, {
            status: 200,
            headers: {
                'Content-Type':
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${tutorName}-timesheet.docx"`,
            },
        });
    } catch (error) {
        console.error('Error generating timesheet:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
