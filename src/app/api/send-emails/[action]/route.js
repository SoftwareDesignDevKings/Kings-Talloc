import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import { adminDb } from '../../../../firestore/adminFirebase';
import { DateTime } from 'luxon';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/authOptions';

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);  

  if (!session || !session.user) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
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

    tutorsMap.forEach((events, tutorEmail) => {
      const mailOptions = {
        from: emailUser,
        to: tutorEmail,
        subject: 'You have new events',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">

                    <!-- Header -->
                    <tr>
                      <td style="background-color: #0d6efd; padding: 30px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Kings-Talloc</h1>
                        <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Tutor Management System</p>
                      </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                      <td style="padding: 32px 24px;">
                        <h2 style="margin: 0 0 8px 0; color: #212529; font-size: 20px; font-weight: 600;">New Events Assigned</h2>
                        <p style="margin: 0 0 24px 0; color: #6c757d; font-size: 14px; line-height: 1.5;">
                          You have been added to the following events. Please review the details below:
                        </p>

                        <!-- Events List -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                          ${events.map((event, index) => `
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
                          `).join('')}
                        </table>

                        <!-- Alert Box -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #cff4fc; border: 1px solid #9eeaf9; border-radius: 4px;">
                          <tr>
                            <td style="padding: 12px 16px;">
                              <p style="margin: 0; color: #055160; font-size: 13px;">
                                Please log in to your dashboard to view more details and confirm your availability.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #dee2e6;">
                        <p style="margin: 0; color: #6c757d; font-size: 12px;">
                          This is an automated notification from Kings-Talloc
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
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
