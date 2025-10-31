import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import { adminDb } from '../../../../firestore/adminFirebase';
import { DateTime } from 'luxon';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import fs from 'fs';
import path from 'path';

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);  

  if (!session || !session.user) {
    return new Response(JSON.stringify({ message: 'Unauthorised' }), { status: 401 });
  }

  console.log('[Email API] User role:', session.user.role);

  if (session.user.role !== 'teacher') {
    return new Response(JSON.stringify({ message: 'Forbidden: Only teachers can send emails', role: session.user.role }), { status: 403 });
  }

  const { action } = params;
  if (action !== 'send') {
    return new Response(JSON.stringify({ message: 'Invalid action' }), { status: 400 });
  }

  // Ensure OAuth2 credentials are loaded
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const emailUser = process.env.GMAIL_USER;

  if (!clientId || !clientSecret || !redirectUri || !refreshToken || !emailUser) {s
    console.error('OAuth2 credentials are not defined');
    return new Response(JSON.stringify({ message: 'OAuth2 credentials are not defined' }), { status: 500 });
  }

  // Create OAuth2 client
  const oAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  oAuth2Client.setCredentials({ refresh_token: refreshToken });

  let accessToken;
  try {
    const accessTokenResponse = await oAuth2Client.getAccessToken();
    accessToken = accessTokenResponse.token;
  } catch (error) {
    console.error('Error getting access token:', error);
    return new Response(JSON.stringify({ message: 'Failed to get access token' }), { status: 500 });
  }

  // Create nodemailer transporter with OAuth2
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: emailUser,
      clientId: clientId,
      clientSecret: clientSecret,
      refreshToken: refreshToken,
      accessToken: accessToken,
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

    // Load email template
    const templatePath = path.join(process.cwd(), 'src', 'app', 'api', 'send-emails', 'templates', 'newEventsEmail.html');
    const emailTemplate = fs.readFileSync(templatePath, 'utf-8');

    tutorsMap.forEach((events, tutorEmail) => {
      // Generate events list HTML
      const eventsListHTML = events.map((event, index) => `
        <tr>
            <td style="padding-bottom: ${index < events.length - 1 ? '12px' : '0'};">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #dee2e6; border-left: 4px solid #0d6efd; border-radius: 4px;">
                    <tr>
                        <td style="padding: 16px;">
                            <h3 style="margin: 0 0 8px 0; color: #212529; font-size: 16px; font-weight: 600;">${event.title}</h3>
                            <p style="margin: 0; color: #6c757d; font-size: 13px;">
                                <span style="display: inline-block; vertical-align: middle;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#6c757d" viewBox="0 0 16 16" style="vertical-align: middle; margin-right: 4px;">
                                        <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/>
                                        <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                                    </svg>
                                </span>
                                ${DateTime.fromJSDate(event.start.toDate(), { zone: 'utc' })
                                  .setZone('Australia/Sydney')
                                  .toLocaleString(DateTime.DATETIME_MED)}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
      `).join('');

      // Replace template placeholder with events list
      const emailHTML = emailTemplate.replace('{{EVENTS_LIST}}', eventsListHTML);

      const mailOptions = {
        from: emailUser,
        to: tutorEmail,
        subject: 'You have new events',
        html: emailHTML,
      };

      emailPromises.push(transporter.sendMail(mailOptions));
    });

    await Promise.all(emailPromises);
  };

  try {
    const querySnapshot = await adminDb.collection('emailEventsQueue').get();
    const emailEventsQueue = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (emailEventsQueue.length > 0) {
      await sendEmailNotification(emailEventsQueue);

      // Delete processed events from the email queue
      const deletePromises = emailEventsQueue.map(event => {
        return adminDb.collection('emailEventsQueue').doc(event.id).delete();
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
