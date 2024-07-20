// app/api/send-emails/[action]/route.js

import nodemailer from 'nodemailer';
import { db } from '../../../firebase'; // Adjust the path as necessary
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

export async function GET(req, { params }) {
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

    console.log('Tutors Map:', tutorsMap); // Debugging line

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
                ${events.map(event => `<li>${event.title} - ${new Date(event.start).toLocaleString()}</li>`).join('')}
              </ul>
              <div style="display: flex; justify-content: center; margin-top: 20px;">
                <a href="https://your-app-url/login" style="padding: 10px 20px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Get Started</a>
              </div>
            </div>
          </div>
        `,
      };

      console.log(`Sending email to ${tutorEmail}`); // Debugging line
      emailPromises.push(transporter.sendMail(mailOptions));
    });

    await Promise.all(emailPromises);
  };

  try {
    const querySnapshot = await getDocs(collection(db, 'eventsQueue'));
    const eventsQueue = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log('Events Queue:', eventsQueue); // Debugging line

    if (eventsQueue.length > 0) {
      console.log('Sending email notifications'); // Debugging line
      await sendEmailNotification(eventsQueue);

      // Delete processed events from the queue
      const deletePromises = eventsQueue.map(event => {
        console.log(`Deleting event with id ${event.id}`); // Debugging line
        return deleteDoc(doc(db, 'eventsQueue', event.id));
      });
      await Promise.all(deletePromises);

      return new Response(JSON.stringify({ message: 'Emails sent successfully' }), { status: 200 });
    } else {
      console.log('No events to send'); // Debugging line
      return new Response(JSON.stringify({ message: 'No events to send' }), { status: 200 });
    }
  } catch (error) {
    console.error('Error sending emails:', error);
    return new Response(JSON.stringify({ message: 'Failed to send emails', error }), { status: 500 });
  }
}
