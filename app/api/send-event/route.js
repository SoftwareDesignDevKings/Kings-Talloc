import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const { subject, description, eventId, start, end, attendees } = await req.json();
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const payload = { subject, description, start, end, eventId, attendees };

    // in deployment - modify to computing@kings.edu.au 
    // in dev - only works with mmei@kings.edu.au from MS Power Automate Configuration
    // https://make.powerautomate.com/environments/Default-81a86f53-d361-4ab3-82fd-d98fac02520d/flows/7a8bc324-b1fa-4734-b2d7-51c745ec63cf/details
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: "mmei@kings.edu.au",
      subject: "[KingsTalloc] New Tutoring Event",
      text: JSON.stringify(payload),
    });

    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Error sending event email:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
