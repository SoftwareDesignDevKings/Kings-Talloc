import { adminDb } from '@/firestore/firestoreAdmin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/security/authConfig';
import { getMicrosoftAccessToken } from '@/lib/microsoft/tokenUtils';
import { msSendEmail } from '@/app/api/microsoft/msGraphFunctions';
import { DateTime } from 'luxon';
import { sanitiseHtml } from '@/lib/security/securityWrappers';

const EMAIL_SEND_MAX_ATTEMPTS = 3;
const EMAIL_RETRY_BASE_DELAY_MS = process.env.NODE_ENV === 'test' ? 0 : 500;
const EMAIL_RETRY_MAX_DELAY_MS = process.env.NODE_ENV === 'test' ? 0 : 2000;
const TEST_EMAIL_RECIPIENT = 'lhamillmamo@kings.edu.au';
const DELETE_NOTIFICATIONS_AFTER_SEND = false;
const TRANSIENT_EMAIL_STATUSES = new Set([429, 500, 502, 503, 504]);
const TRANSIENT_EMAIL_CODES = new Set([
    'ApplicationThrottled',
    'ErrorServerBusy',
    'MailboxConcurrency',
    'TooManyRequests',
]);
const EMAIL_ADDRESS_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normaliseRecipientEmail = (member) => {
    const email = typeof member === 'string'
        ? member
        : member?.value || member?.email || '';
    return typeof email === 'string' ? email.trim().toLowerCase() : '';
};

export const isValidEmailAddress = (email) => EMAIL_ADDRESS_RE.test(email);

export const buildTutorEmailEntries = (notifications) => {
    const tutorMap = new Map();
    const invalidRecipients = [];

    for (const notification of notifications) {
        const seenForNotification = new Set();

        for (const member of (notification.staff || [])) {
            const email = normaliseRecipientEmail(member);
            if (!isValidEmailAddress(email)) {
                invalidRecipients.push({
                    notificationId: notification.id,
                    recipient: String(member?.value || member?.email || member || 'missing'),
                    reason: 'Invalid or missing tutor email address',
                });
                continue;
            }

            if (seenForNotification.has(email)) continue;
            seenForNotification.add(email);

            if (!tutorMap.has(email)) tutorMap.set(email, []);
            tutorMap.get(email).push(notification);
        }
    }

    return {
        tutorEntries: Array.from(tutorMap.entries()),
        invalidRecipients,
    };
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const redactEmail = (email) => {
    if (!email || !email.includes('@')) return 'unknown recipient';

    const [localPart, domain] = email.split('@');
    const visibleLocal = localPart.slice(0, 1);
    return `${visibleLocal}${'*'.repeat(Math.max(localPart.length - 1, 1))}@${domain}`;
};

const serialiseEmailError = (error) => ({
    message: error?.message || 'Unknown email send failure',
    status: error?.status || null,
    code: error?.code || null,
    graphRequestId: error?.graphRequestId || null,
    retryAfter: error?.retryAfter || null,
    attempts: error?.attempts || null,
});

const failureReason = (error) =>
    error?.code ||
    error?.statusText ||
    (error?.status ? `HTTP ${error.status}` : null) ||
    error?.message ||
    'Unknown failure';

const isTransientEmailError = (error) => {
    const message = String(error?.message || '').toLowerCase();
    return (
        TRANSIENT_EMAIL_STATUSES.has(error?.status) ||
        TRANSIENT_EMAIL_CODES.has(error?.code) ||
        message.includes('mailboxconcurrency') ||
        message.includes('too many requests') ||
        message.includes('server busy')
    );
};

const getRetryDelayMs = (error, attempt) => {
    if (Number.isFinite(error?.retryAfterMs)) {
        return Math.min(error.retryAfterMs, EMAIL_RETRY_MAX_DELAY_MS);
    }

    return Math.min(
        EMAIL_RETRY_BASE_DELAY_MS * (2 ** Math.max(attempt - 1, 0)),
        EMAIL_RETRY_MAX_DELAY_MS
    );
};

export const sendEmailWithRetry = async (
    accessToken,
    emailData,
    {
        sendEmail = msSendEmail,
        sleep = delay,
        maxAttempts = EMAIL_SEND_MAX_ATTEMPTS,
    } = {}
) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            return await sendEmail(accessToken, emailData);
        } catch (error) {
            error.attempts = attempt;
            const shouldRetry = attempt < maxAttempts && isTransientEmailError(error);
            if (!shouldRetry) {
                throw error;
            }

            await sleep(getRetryDelayMs(error, attempt));
        }
    }

    return false;
};

const buildFailureDetails = (sendFailures, invalidRecipients) => [
    ...sendFailures.map((failure) => ({
        recipient: redactEmail(failure.tutorEmail),
        reason: failureReason(failure.reason),
        status: failure.reason?.status || null,
        code: failure.reason?.code || null,
        requestId: failure.reason?.graphRequestId || null,
        attempts: failure.reason?.attempts || null,
    })),
    ...invalidRecipients.map((failure) => ({
        recipient: redactEmail(failure.recipient),
        reason: failure.reason,
        status: null,
        code: 'INVALID_RECIPIENT',
        requestId: null,
        attempts: 0,
    })),
];

const buildFailureMessage = (failureDetails) => {
    if (failureDetails.length === 0) return '';

    const visibleFailures = failureDetails
        .slice(0, 3)
        .map((failure) => `${failure.recipient}: ${failure.reason}`)
        .join('; ');
    const remaining = failureDetails.length > 3
        ? `; ${failureDetails.length - 3} more`
        : '';

    return ` Failed: ${visibleFailures}${remaining}.`;
};

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

    try {
        const userEmail = session.user.email;

        const snapshot = await adminDb.collection('emailNotifications').where('createdByEmail', '==', userEmail).get();
        if (snapshot.empty) {
            return Response.json({ message: 'No notifications to send.' });
        }

        const notifications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        const { tutorEntries, invalidRecipients } = buildTutorEmailEntries(notifications);
        if (tutorEntries.length === 0 && invalidRecipients.length === 0) {
            return Response.json({ message: 'No tutor recipients found in queued notifications.' }, { status: 400 });
        }

        const results = [];
        for (const [tutorEmail, tutorNotifications] of tutorEntries) {
            try {
                await sendEmailWithRetry(msAccessToken, {
                    targetEmail: TEST_EMAIL_RECIPIENT,
                    subject: `Talloc Shift Notification (TEST for ${tutorEmail})`,
                    htmlContent: buildEmailHTML(tutorNotifications, tutorEmail),
                    saveToSentItems: true,
                });
                results.push({ status: 'fulfilled', tutorEmail, tutorNotifications });
            } catch (error) {
                results.push({ status: 'rejected', tutorEmail, tutorNotifications, reason: error });
            }
        }

        // Track notifications that had at least one failed send — keep those for retry
        const failedNotifIds = new Set(invalidRecipients.map((failure) => failure.notificationId));
        results.forEach((result) => {
            if (result.status === 'rejected') {
                console.error(
                    `[send-emails] Failed to send test email for ${result.tutorEmail} to ${TEST_EMAIL_RECIPIENT}:`,
                    serialiseEmailError(result.reason)
                );
                for (const n of result.tutorNotifications) {
                    failedNotifIds.add(n.id);
                }
            }
        });

        const idsToDelete = notifications.map((n) => n.id).filter((id) => !failedNotifIds.has(id));
        if (DELETE_NOTIFICATIONS_AFTER_SEND && idsToDelete.length > 0) {
            const batch = adminDb.batch();
            for (const id of idsToDelete) {
                batch.delete(adminDb.collection('emailNotifications').doc(id));
            }
            await batch.commit();
        }

        const sendFailures = results.filter((r) => r.status === 'rejected');
        const failCount = sendFailures.length + invalidRecipients.length;
        const totalRecipients = tutorEntries.length + invalidRecipients.length;
        if (failCount > 0) {
            const failureDetails = buildFailureDetails(sendFailures, invalidRecipients);
            return Response.json(
                {
                    message: `${totalRecipients - failCount} of ${totalRecipients} test emails sent to ${TEST_EMAIL_RECIPIENT}. ${failCount} failed or skipped — retry to resend. Notifications were left queued.${buildFailureMessage(failureDetails)}`,
                    failures: failureDetails,
                },
                { status: 500 }
            );
        }

        return Response.json({ message: `${tutorEntries.length} test email(s) sent to ${TEST_EMAIL_RECIPIENT}. Notifications were left queued.` });
    } catch (error) {
        console.error('[send-emails] Unexpected error:', error);
        return Response.json({ message: 'Failed to send emails' }, { status: 500 });
    }
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
              <h3 style="margin:0 0 8px 0;color:#111827;font-size:16px;font-weight:700;">${sanitiseHtml(notification.title)}</h3>
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
              <h3 style="margin:0 0 10px 0;color:#111827;font-size:16px;font-weight:700;">${sanitiseHtml(notification.title)}</h3>
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

function buildEmailHTML(notifications, originalRecipient) {
    const rows = notifications
        .map((notification, index) => buildEventRow(notification, index, notifications.length))
        .join('');

    const dashboardUrl = process.env.NEXTAUTH_URL || '#';

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

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                      <strong>Test redirect:</strong> this email would normally be sent to ${sanitiseHtml(originalRecipient)}.
                      It was sent to ${TEST_EMAIL_RECIPIENT} for testing.
                    </p>
                  </td>
                </tr>
              </table>

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
                          <a href="${dashboardUrl}" style="display:block;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 36px;letter-spacing:0.2px;">View My Dashboard &rarr;</a>
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
