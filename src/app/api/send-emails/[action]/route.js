import { adminDb } from '../../../../firestore/firestoreAdmin';
import { DateTime } from 'luxon';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/authOptions';

export async function GET(_req, { params }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new Response(JSON.stringify({ message: 'Unauthorised' }), { status: 401 });
    }

    if (session.user.role !== 'teacher') {
        return new Response(
            JSON.stringify({
                message: 'Forbidden: Only teachers can send emails',
                role: session.user.role,
            }),
            { status: 403 },
        );
    }

    const { action } = await params;
    if (action !== 'send') {
        return new Response(JSON.stringify({ message: 'Invalid action' }), { status: 400 });
    }

    // Get Microsoft access token from session
    const accessToken = session.user.microsoftAccessToken;
    if (!accessToken) {
        console.error('Microsoft access token not found in session');
        return new Response(JSON.stringify({ message: 'Microsoft access token not found' }), {
            status: 500,
        });
    }

    const generateEventRow = (event, index, totalEvents) => {
        const formattedDate = DateTime.fromJSDate(event.start.toDate(), { zone: 'utc' })
            .setZone('Australia/Sydney')
            .toLocaleString(DateTime.DATETIME_MED);

        return `<tr>
      <td style="padding-bottom: ${index < totalEvents - 1 ? '12px' : '0'};">
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
                ${formattedDate}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
    };

    const generateEmailHTML = (events) => {
        const eventRows = events
            .map((event, index) => generateEventRow(event, index, events.length))
            .join('');

        return `<!DOCTYPE html>
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
          <tr>
            <td style="background-color: #0d6efd; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Kings-Talloc</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Tutor Management System</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px;">
              <h2 style="margin: 0 0 8px 0; color: #212529; font-size: 20px; font-weight: 600;">Event Notifications</h2>
              <p style="margin: 0 0 24px 0; color: #6c757d; font-size: 14px; line-height: 1.5;">
                You have been added to the following events or your times have been adjusted. Please review the details below.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                ${eventRows}
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #cff4fc; border: 1px solid #9eeaf9; border-radius: 4px; margin-bottom: 16px;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="margin: 0; color: #055160; font-size: 13px;">
                      Please log in to your dashboard to view more details and confirm your availability.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #6c757d; font-size: 13px; line-height: 1.5;">
                Any questions please email <a href="mailto:computing@kings.edu.au" style="color: #0d6efd; text-decoration: none;">computing@kings.edu.au</a>
              </p>
            </td>
          </tr>
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
</html>`;
    };

    const sendEmailNotification = async (events) => {
        // Build tutor map
        const tutorsMap = new Map();
        for (const event of events) {
            for (const tutor of event.staff) {
                if (!tutorsMap.has(tutor.value)) {
                    tutorsMap.set(tutor.value, []);
                }
                tutorsMap.get(tutor.value).push(event);
            }
        }

        // Send all emails in parallel
        const emailPromises = Array.from(tutorsMap.entries()).map(async ([tutorEmail, tutorEvents]) => {
            const emailBody = generateEmailHTML(tutorEvents);

            return fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: {
                        subject: 'Talloc Event Notification',
                        body: {
                            contentType: 'HTML',
                            content: emailBody,
                        },
                        toRecipients: [
                            {
                                emailAddress: { address: tutorEmail },
                            },
                        ],
                    },
                    saveToSentItems: 'true',
                }),
            }).then(async (response) => {
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(
                        `Failed to send email to ${tutorEmail}: ${error.error?.message || response.statusText}`,
                    );
                }
            });
        });

        await Promise.all(emailPromises);
    };

    try {
        const querySnapshot = await adminDb.collection('emailEventsQueue').get();
        const emailEventsQueue = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // Filter out testing events
        const eventsToSend = emailEventsQueue.filter((event) => !event.title?.includes('(TESTING)'));

        if (emailEventsQueue.length > 0) {
            // Send emails for non-testing events
            if (eventsToSend.length > 0) {
                await sendEmailNotification(eventsToSend);
            }

            // Delete all processed events from the queue (including testing events)
            const deletePromises = emailEventsQueue.map((event) => {
                return adminDb.collection('emailEventsQueue').doc(event.id).delete();
            });
            await Promise.all(deletePromises);

            const testingEventsCount = emailEventsQueue.length - eventsToSend.length;
            let message = 'Emails sent successfully';

            if (eventsToSend.length === 0 && testingEventsCount > 0) {
                message = `No emails sent (${testingEventsCount} testing event(s) skipped)`;
            } else if (testingEventsCount > 0) {
                message = `Emails sent successfully (${testingEventsCount} testing event(s) skipped)`;
            }

            return new Response(JSON.stringify({ message }), {
                status: 200,
            });
        } else {
            return new Response(JSON.stringify({ message: 'No events to send' }), { status: 200 });
        }
    } catch (error) {
        console.error('Error sending emails:', error);
        return new Response(JSON.stringify({ message: 'Failed to send emails', error }), {
            status: 500,
        });
    }
}
