import { APPROVAL_GRACE_MS } from '@/lib/scheduling/eventRules';
// Initial preference for existing accounts. Manage Users can enable notifications for teachers.
export const getRequestNotificationPreference = (email, user = {}) =>
    typeof user.requestNotificationsEnabled === 'boolean'
        ? user.requestNotificationsEnabled
        : email?.trim().toLowerCase() === 'mienna@kings.edu.au';
export const REQUEST_ACK_STORAGE_PREFIX = 'kings-talloc:request-ack:';

export const timestampValue = (value) => {
    if (!value || !Number.isInteger(value.seconds) || !Number.isInteger(value.nanoseconds)) return null;
    return { seconds: value.seconds, nanoseconds: value.nanoseconds };
};

export const compareTimestamps = (a, b) =>
    a.seconds - b.seconds || a.nanoseconds - b.nanoseconds;

export const latestRequestTimestamp = (requests) => requests.reduce((latest, request) => {
    const timestamp = timestampValue(request.createdAt);
    return timestamp && compareTimestamps(timestamp, latest) > 0 ? timestamp : latest;
}, { seconds: 0, nanoseconds: 0 });

export const futurePendingRequests = (requests, now) => requests
    .filter(request => request.approvalStatus === 'pending' && request.start.getTime() + APPROVAL_GRACE_MS >= now)
    .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));

export const countNewRequests = (requests, acknowledgedAt) => acknowledgedAt === null ? 0 : requests.filter(request => {
    const createdAt = timestampValue(request.createdAt);
    return createdAt && compareTimestamps(createdAt, acknowledgedAt) > 0;
}).length;
