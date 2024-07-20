// app/api/send-email/route.js

import nodemailer from 'nodemailer';

export async function POST(request) {
  const { to, subject, text, eventTitle } = await request.json();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // your Gmail address
      pass: process.env.EMAIL_PASS, // your Gmail password or app-specific password
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background: #f4f4f4; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
        <div style="background: white; padding: 20px; border-radius: 10px;">
          <h2 style="text-align: center; color: #333;">Retalloc</h2>
          <p style="color: #555; text-align: center; font-size: 16px;">
            You have been added to a new event titled "${eventTitle}".
          </p>
          <div style="display: flex; justify-content: center; margin-top: 20px;">
            <a href="https://retalloc.vercel.app/dashboard" style="padding: 10px 20px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Get Started</a>
          </div>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return new Response(JSON.stringify({ message: 'Email sent successfully' }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Failed to send email', error }), { status: 500 });
  }
}
