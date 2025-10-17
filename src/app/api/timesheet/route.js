import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export async function POST(req) {
    const { tutorName, hoursData, role } = await req.json();

    // 1. Load the template
    const templatePath = path.resolve("./src/templates/timesheet.docx");
    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    // 2. Compute week ending (this Friday)
    const today = new Date();
    const diff = 5 - today.getDay(); // Friday = 5
    const weekEnding = new Date(today);
    weekEnding.setDate(today.getDate() + diff);

    // 3. Prepare data
    const totalHours = Object.values(hoursData).reduce((a, b) => a + (parseFloat(b.total) || 0), 0);

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

    console.log('Template data:', templateData);

    // 4. Render (use render() with data instead of setData())
    doc.render(templateData);

    // 5. Export - return as download instead of saving to disk
    const buffer = doc.getZip().generate({ type: "nodebuffer" });

    return new Response(buffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${tutorName}-timesheet.docx"`
        }
    });
}
