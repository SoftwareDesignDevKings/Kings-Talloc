import nodemailer from 'nodemailer';
import { getEventsQueue, clearEventsQueue } from '../store-event/route';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmailNotification = async (events) => {
  const emailPromises = [];

  const tutorsMap = new Map();

  events.forEach(event => {
    event.staff.forEach(tutor => {
      if (!tutorsMap.has(tutor.value)) {
        tutorsMap.set(tutor.value, []);
      }
      tutorsMap.get(tutor.value).push(event);
    });
  });

  console.log('Tutors Map:', tutorsMap); // Add this line for debugging

  tutorsMap.forEach((events, tutorEmail) => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: tutorEmail,
      subject: 'You have new events',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background: #f4f4f4; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
          <div style="background: white; padding: 20px; border-radius: 10px;">
            <h2 style="text-align: center; color: #333;">Retalloc</h2>
            <p style="color: #555; text-align: center; font-size: 16px;">
              You have been added to the following new events:
            </p>
            <ul style="color: #555; text-align: left; font-size: 16px;">
              ${events.map(event => `<li>${event.title} - ${new Date(event.start).toLocaleString()}</li>`).join('')}
            </ul>
            <div style="display: flex; justify-content: center; margin-top: 20px;">
              <a href="https://your-app-url/login" style="padding: 10px 20px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Get Started</a>
            </div>
          </div>
        </div>
      `,
    };

    emailPromises.push(transporter.sendMail(mailOptions));
  });

  await Promise.all(emailPromises);
};

export async function GET(request) {
  const eventsQueue = getEventsQueue();
  console.log('Events Queue:', eventsQueue); // Add this line for debugging
  if (eventsQueue.length > 0) {
    await sendEmailNotification(eventsQueue);
    clearEventsQueue();
    return new Response(JSON.stringify({ message: 'Emails sent successfully' }), { status: 200 });
  } else {
    return new Response(JSON.stringify({ message: 'No events to send' }), { status: 200 });
  }
}
