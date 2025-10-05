import nodemailer from 'nodemailer';
import { db } from '../../../../firebase/db'; // Adjust the path as necessary
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { DateTime } from 'luxon';

export async function GET(req, { params }) {
  // Temporarily disabled
  return new Response(JSON.stringify({ message: 'Email sending temporarily disabled' }), { status: 503 });

  const { action } = params;

  if (action !== 'send') {
    return new Response(JSON.stringify({ message: 'Invalid action' }), { status: 400 });
  }

  // Ensure email credentials are loaded
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) {
    console.error('Email credentials are not defined');
    return new Response(JSON.stringify({ message: 'Email credentials are not defined' }), { status: 500 });
  }

  // Create nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
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

    tutorsMap.forEach((events, tutorEmail) => {
      const mailOptions = {
        from: emailUser,
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
                ${events.map(event => `
                  <li>${event.title} - ${DateTime.fromJSDate(event.start.toDate(), { zone: 'utc' })
                    .setZone('Australia/Sydney')
                    .toLocaleString(DateTime.DATETIME_MED)}</li>
                `).join('')}
              </ul>
            </div>
          </div>
        `,
      };

      emailPromises.push(transporter.sendMail(mailOptions));
    });

    await Promise.all(emailPromises);
  };

  try {
    const querySnapshot = await getDocs(collection(db, 'emailEventsQueue'));
    const emailEventsQueue = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (emailEventsQueue.length > 0) {
      await sendEmailNotification(emailEventsQueue);

      // Delete processed events from the email queue
      const deletePromises = emailEventsQueue.map(event => {
        return deleteDoc(doc(db, 'emailEventsQueue', event.id));
      });
      await Promise.all(deletePromises);

      return new Response(JSON.stringify({ message: 'Emails sent successfully' }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ message: 'No events to send' }), { status: 200 });
    }
  } catch (error) {
    console.error('Error sending emails:', error);
    return new Response(JSON.stringify({ message: 'Failed to send emails', error }), { status: 500 });
  }
}
