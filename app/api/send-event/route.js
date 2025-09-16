import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const { subject, start, end, attendees } = await req.json();
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const payload = {
      token: "ABC123SECRET",
      subject,
      start,
      end,
      attendees,
    };

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
