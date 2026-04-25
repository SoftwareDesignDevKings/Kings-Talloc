import { adminDb } from '@/firestore/firestoreAdmin';
import { getServerSession } from 'next-auth/next';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/security/authConfig';
import { msSendEmail } from '@/app/api/microsoft/msGraphFunctions';
import { DateTime } from 'luxon';

export async function POST(req) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return Response.json({ message: 'Unauthorised' }, { status: 401 });
    }

    const userRole = session.user.defaultRole || session.user.role;
    const isAdmin = userRole === 'admin' || (session.user.userRoles || []).includes('admin');
    if (!isAdmin) {
        return Response.json({ message: 'Forbidden: Only admins can send emails' }, { status: 403 });
    }

    const msAccessToken = await getMicrosoftAccessToken(req);
    if (!msAccessToken) {
        return Response.json({ error: 'REAUTH_REQUIRED' }, { status: 401 });
    }

    const snapshot = await adminDb.collection('emailNotifications').get();
    if (snapshot.empty) {
        return Response.json({ message: 'No notifications to send.' });
    }

    const notifications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const tutorMap = new Map();
    for (const notification of notifications) {
        for (const member of (notification.staff || [])) {
            const email = member.value || member;

            if (!tutorMap.has(email)) {
                tutorMap.set(email, []);
            }

            tutorMap.get(email).push(notification);
        }
    }

	const tutorEntries = Array.from(tutorMap.entries());
	const sendPromises = [];

	for (let i = 0; i < tutorEntries.length; i++) {
		const [tutorEmail, tutorNotifications] = tutorEntries[i];
		const html = buildEmailHTML(tutorNotifications);

		sendPromises.push(msSendEmail(msAccessToken, {
			targetEmail: tutorEmail,
			subject: 'Talloc Shift Notification',
			htmlContent: html,
			saveToSentItems: true,
		}));
	}

	await Promise.all(sendPromises);

    const batch = adminDb.batch();
    for (const notification of notifications) {
        batch.delete(adminDb.collection('emailNotifications').doc(notification.id));
    }
    await batch.commit();

    return Response.json({ message: `Emails sent to ${tutorMap.size} tutor(s).` });
}

async function getMicrosoftAccessToken(req) {
    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.msRefreshToken) {
        return null;
    }

    const TOKEN_BUFFER_MS = 60 * 1000;
    const msAccessTokenExpiry = token.msAccessTokenExpiry ?? 0;

    if (token.msAccessToken && Date.now() < msAccessTokenExpiry - TOKEN_BUFFER_MS) {
        return token.msAccessToken;
    }

    return refreshMicrosoftToken(token.msRefreshToken);
}

async function refreshMicrosoftToken(msRefreshToken) {
    const response = await fetch(
        `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.AZURE_AD_CLIENT_ID,
                client_secret: process.env.AZURE_AD_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: msRefreshToken,
                scope: 'openid profile email offline_access User.Read Calendars.ReadWrite Mail.Send',
            }),
        }
    );

    if (!response.ok) {
        console.error('MS token refresh failed:', await response.text());
        return null;
    }

    const tokenData = await response.json();

    return tokenData.access_token;
}

/* ── HTML helpers ──────────────────────────────────────────────────────── */

function formatDate(value) {
    const date = value?.toDate ? value.toDate() : new Date(value);

    return DateTime.fromJSDate(date, { zone: 'utc' })
        .setZone('Australia/Sydney')
        .toLocaleString(DateTime.DATETIME_MED);
}

function buildEventRow(notification, index, total) {
    const isLast = index === total - 1;
    const paddingBottom = isLast ? '0' : '14px';

    if (notification.action === 'allocated') {
        return `<tr>
      <td style="padding-bottom:${paddingBottom};">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #1d4ed8;border-radius:8px;">
          <tr>
            <td style="padding:18px 20px;">
              <table cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                <tr>
                  <td style="background-color:#dbeafe;border-radius:20px;padding:3px 11px;">
                    <span style="color:#1e40af;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;">New Shift</span>
                  </td>
                </tr>
              </table>
              <h3 style="margin:0 0 8px 0;color:#111827;font-size:16px;font-weight:700;">${notification.title}</h3>
              <p style="margin:0;color:#374151;font-size:13px;line-height:1.6;">
                <span style="color:#1e40af;font-weight:600;">When:</span>&nbsp; ${formatDate(notification.start)} &ndash; ${formatDate(notification.end)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
    } else {
        return `<tr>
      <td style="padding-bottom:${paddingBottom};">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #ea580c;border-radius:8px;">
          <tr>
            <td style="padding:18px 20px;">
              <table cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                <tr>
                  <td style="background-color:#ffedd5;border-radius:20px;padding:3px 11px;">
                    <span style="color:#9a3412;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;">Time Changed</span>
                  </td>
                </tr>
              </table>
              <h3 style="margin:0 0 10px 0;color:#111827;font-size:16px;font-weight:700;">${notification.title}</h3>
              <p style="margin:0 0 4px 0;color:#9ca3af;font-size:13px;text-decoration:line-through;">
                ${formatDate(notification.previousStart)} &ndash; ${formatDate(notification.previousEnd)}
              </p>
              <p style="margin:0;color:#374151;font-size:13px;font-weight:600;">
                ${formatDate(notification.start)} &ndash; ${formatDate(notification.end)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
    }
}

function buildEmailHTML(notifications) {
    const rows = notifications
        .map((notification, index) => buildEventRow(notification, index, notifications.length))
        .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1d4ed8;border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">
              <p style="margin:0 0 6px 0;color:rgba(255,255,255,0.65);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Kings Tutor Management</p>
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Shift Notifications</h1>
            </td>
          </tr>

          <!-- Header accent bar -->
          <tr>
            <td style="background-color:#3b82f6;height:3px;"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px;">

              <p style="margin:0 0 28px 0;color:#4b5563;font-size:15px;line-height:1.7;">
                You have been added to the following shifts or your times have been adjusted. Please review the details below.
              </p>

              <!-- Shift cards -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
                ${rows}
              </table>

              <!-- CTA button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color:#1d4ed8;border-radius:8px;">
                          <a href="#" style="display:block;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 36px;letter-spacing:0.2px;">View My Dashboard &rarr;</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Contact -->
              <p style="margin:0;color:#9ca3af;font-size:13px;text-align:center;line-height:1.5;">
                Questions? Email&nbsp;<a href="mailto:computing@kings.edu.au" style="color:#1d4ed8;text-decoration:none;font-weight:500;">computing@kings.edu.au</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">This is an automated notification from Kings-Talloc &middot; Do not reply to this email</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}