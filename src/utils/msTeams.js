import { getSession } from 'next-auth/react';

/**
 * Creates a MS Teams meeting via Microsoft Graph API (client-side)
 */
export const createTeamsMeeting = async (
    subject,
    description,
    startTime,
    endTime,
    attendeesEmailArr,
) => {
    try {
        const session = await getSession();
        const accessToken = session?.user?.microsoftAccessToken;

        if (!accessToken) {
            throw new Error('Microsoft access token not found');
        }

        const URL = 'https://graph.microsoft.com/v1.0/me/events';
        const response = await fetch(URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subject: subject,
                body: {
                    contentType: 'HTML',
                    content: description || '',
                },
                start: {
                    dateTime: startTime,
                    timeZone: 'UTC',
                },
                end: {
                    dateTime: endTime,
                    timeZone: 'UTC',
                },
                attendees: attendeesEmailArr.map((email) => ({
                    emailAddress: {
                        address: email,
                    },
                    type: 'required',
                })),
                isOnlineMeeting: true,
                onlineMeetingProvider: 'teamsForBusiness',
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to create Teams meeting: ${error.error?.message || response.statusText}`,
            );
        }

        const meeting = await response.json();
        // Return the event ID for storage in Firestore
        return {
            teamsEventId: meeting.id,
            joinUrl: meeting.onlineMeeting?.joinUrl,
        };
    } catch (error) {
        console.error('Error creating Teams meeting:', error);
        throw new Error(error.message || 'Failed to create Teams meeting');
    }
};

export const updateTeamsMeeting = async (
    eventId,
    subject,
    description,
    startTime,
    endTime,
    attendeesEmailArr,
) => {
    try {
        const session = await getSession();
        const accessToken = session?.user?.microsoftAccessToken;

        if (!accessToken) {
            throw new Error('Microsoft access token not found');
        }

        const URL = `https://graph.microsoft.com/v1.0/me/events/${eventId}`;
        const response = await fetch(URL, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subject: subject,
                body: {
                    contentType: 'HTML',
                    content: description || '',
                },
                start: {
                    dateTime: startTime,
                    timeZone: 'UTC',
                },
                end: {
                    dateTime: endTime,
                    timeZone: 'UTC',
                },
                attendees: attendeesEmailArr.map((email) => ({
                    emailAddress: {
                        address: email,
                    },
                    type: 'required',
                })),
                isOnlineMeeting: true,
                onlineMeetingProvider: 'teamsForBusiness',
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to update Teams meeting: ${error.error?.message || response.statusText}`,
            );
        }

        const meeting = await response.json();
        return meeting;
    } catch (error) {
        console.error('Error updating Teams meeting:', error);
        throw new Error(error.message || 'Failed to update Teams meeting');
    }
};

export const deleteTeamsMeeting = async (eventId) => {
    try {
        const session = await getSession();
        const accessToken = session?.user?.microsoftAccessToken;

        if (!accessToken) {
            throw new Error('Microsoft access token not found');
        }

        const URL = `https://graph.microsoft.com/v1.0/me/events/${eventId}`;
        const response = await fetch(URL, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok && response.status !== 404) {
            const error = await response.json();
            throw new Error(
                `Failed to delete Teams meeting: ${error.error?.message || response.statusText}`,
            );
        }

        return true;
    } catch (error) {
        console.error('Error deleting Teams meeting:', error);
        throw new Error(error.message || 'Failed to delete Teams meeting');
    }
};
