import { getSession } from 'next-auth/react';

export const setTeamsMeetingAutoRecord = async (onlineMeetingId, accessToken) => {
    try {
        const URL = `https://graph.microsoft.com/v1.0/me/onlineMeetings/${onlineMeetingId}`;
        const response = await fetch(URL, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recordAutomatically: true,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to set auto-record for Teams meeting: ${error.error?.message || response.statusText}`,
            );
        }
        return true;
    } catch (error) {
        console.error('Error setting auto-record for Teams meeting:', error);
        throw new Error(error.message || 'Failed to set auto-record for Teams meeting');
    }
};

/**
 * Creates a MS Teams meeting via Microsoft Graph API (client-side)
 * @param {string} subject - Event title
 * @param {string} description - Event description
 * @param {string} startTime - Start time in ISO format
 * @param {string} endTime - End time in ISO format
 * @param {Array<string>} attendeesEmailArr - Array of attendee emails
 * @param {Object} recurrenceOptions - Optional recurrence configuration
 * @param {string} recurrenceOptions.recurring - 'weekly' or 'fortnightly'
 * @param {Date} recurrenceOptions.until - End date for recurrence
 */
export const createTeamsMeeting = async (
    subject,
    description,
    startTime,
    endTime,
    attendeesEmailArr,
    recurrenceOptions = null,
) => {
    try {
        const session = await getSession();
        const accessToken = session?.user?.microsoftAccessToken;

        if (!accessToken) {
            throw new Error('Microsoft access token not found');
        }

        const eventBody = {
            subject: subject,
            body: {
                contentType: 'HTML',
                content: description || '',
            },
            start: {
                dateTime: startTime,
                timeZone: 'Australia/Sydney',
            },
            end: {
                dateTime: endTime,
                timeZone: 'Australia/Sydney',
            },
            attendees: attendeesEmailArr.map((email) => ({
                emailAddress: {
                    address: email,
                },
                type: 'required',
            })),
            isOnlineMeeting: true,
            onlineMeetingProvider: 'teamsForBusiness',
        };

        // Add recurrence if specified
        if (recurrenceOptions && recurrenceOptions.recurring) {
            const startDate = new Date(startTime);
            const endDate = recurrenceOptions.until || new Date(startDate);
            if (!recurrenceOptions.until) {
                endDate.setMonth(endDate.getMonth() + 3); // Default 3 months
            }

            eventBody.recurrence = {
                pattern: {
                    type: 'weekly',
                    interval: recurrenceOptions.recurring === 'weekly' ? 1 : 2,
                    daysOfWeek: [
                        [
                            'Sunday',
                            'Monday',
                            'Tuesday',
                            'Wednesday',
                            'Thursday',
                            'Friday',
                            'Saturday',
                        ][startDate.getUTCDay()],
                    ],
                },
                range: {
                    type: 'endDate',
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                },
            };
        }

        const URL = 'https://graph.microsoft.com/v1.0/me/events';
        const response = await fetch(URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventBody),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to create Teams meeting: ${error.error?.message || response.statusText}`,
            );
        }

        const meeting = await response.json();

        // Call the new helper function to set auto-recording in the background
        if (meeting.onlineMeeting?.id) {
            setTeamsMeetingAutoRecord(meeting.onlineMeeting.id, accessToken)
                .catch(autoRecordError => {
                    console.warn(`Could not set auto-recording for Teams meeting ${meeting.id}:`, autoRecordError.message);
                });
        }
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
    recurrenceOptions = null,
) => {
    try {
        const session = await getSession();
        const accessToken = session?.user?.microsoftAccessToken;

        if (!accessToken) {
            throw new Error('Microsoft access token not found');
        }

        const eventBody = {
            subject: subject,
            body: {
                contentType: 'HTML',
                content: description || '',
            },
            start: {
                dateTime: startTime,
                timeZone: 'Australia/Sydney',
            },
            end: {
                dateTime: endTime,
                timeZone: 'Australia/Sydney',
            },
            attendees: attendeesEmailArr.map((email) => ({
                emailAddress: {
                    address: email,
                },
                type: 'required',
            })),
        };

        // Add recurrence if specified
        if (recurrenceOptions && recurrenceOptions.recurring) {
            const startDate = new Date(startTime);
            const endDate = recurrenceOptions.until || new Date(startDate);
            if (!recurrenceOptions.until) {
                endDate.setMonth(endDate.getMonth() + 3); // Default 3 months
            }

            eventBody.recurrence = {
                pattern: {
                    type: 'weekly',
                    interval: recurrenceOptions.recurring === 'weekly' ? 1 : 2,
                    daysOfWeek: [
                        [
                            'Sunday',
                            'Monday',
                            'Tuesday',
                            'Wednesday',
                            'Thursday',
                            'Friday',
                            'Saturday',
                        ][startDate.getUTCDay()],
                    ],
                },
                range: {
                    type: 'endDate',
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                },
            };
        }

        const URL = `https://graph.microsoft.com/v1.0/me/events/${eventId}`;
        const response = await fetch(URL, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventBody),
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

/**
 * Update recurrence end date for a recurring Teams meeting (to delete future occurrences)
 * @param {string} seriesMasterId - The series master ID
 * @param {Date} newEndDate - New end date for the series
 */
export const updateTeamsMeetingRecurrenceEndDate = async (seriesMasterId, newEndDate) => {
    try {
        const session = await getSession();
        const accessToken = session?.user?.microsoftAccessToken;

        if (!accessToken) {
            throw new Error('Microsoft access token not found');
        }

        // Get the existing event to preserve the recurrence pattern
        const getURL = `https://graph.microsoft.com/v1.0/me/events/${seriesMasterId}`;
        const getResponse = await fetch(getURL, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!getResponse.ok) {
            throw new Error('Failed to fetch existing event');
        }

        const existingEvent = await getResponse.json();

        // Update only the recurrence end date
        const patchURL = `https://graph.microsoft.com/v1.0/me/events/${seriesMasterId}`;
        const response = await fetch(patchURL, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recurrence: {
                    pattern: existingEvent.recurrence.pattern,
                    range: {
                        ...existingEvent.recurrence.range,
                        type: 'endDate',
                        endDate: newEndDate.toISOString().split('T')[0],
                    },
                },
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to update recurrence end date: ${error.error?.message || response.statusText}`,
            );
        }

        return true;
    } catch (error) {
        console.error('Error updating recurrence end date:', error);
        throw new Error(error.message || 'Failed to update recurrence end date');
    }
};

/**
 * Get occurrence ID for a specific instance in a recurring series
 * This is needed to update/delete a single occurrence
 * @param {string} seriesMasterId - The series master ID
 * @param {Date} occurrenceDate - The date of the occurrence
 */
export const getTeamsMeetingOccurrenceId = async (seriesMasterId, occurrenceDate) => {
    try {
        const session = await getSession();
        const accessToken = session?.user?.microsoftAccessToken;

        if (!accessToken) {
            throw new Error('Microsoft access token not found');
        }

        // Get instances of the series
        const startDateTime = new Date(occurrenceDate);
        startDateTime.setHours(0, 0, 0, 0);
        const endDateTime = new Date(occurrenceDate);
        endDateTime.setHours(23, 59, 59, 999);

        const URL = `https://graph.microsoft.com/v1.0/me/events/${seriesMasterId}/instances?startDateTime=${startDateTime.toISOString()}&endDateTime=${endDateTime.toISOString()}`;
        const response = await fetch(URL, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to get occurrence: ${error.error?.message || response.statusText}`,
            );
        }

        const data = await response.json();
        if (data.value && data.value.length > 0) {
            return data.value[0].id;
        }

        throw new Error('Occurrence not found');
    } catch (error) {
        console.error('Error getting occurrence ID:', error);
        throw new Error(error.message || 'Failed to get occurrence ID');
    }
};

/**
 * Update a single occurrence in a recurring Teams meeting series
 * @param {string} occurrenceId - The occurrence ID (not seriesMasterId)
 * @param {string} subject - Event title
 * @param {string} description - Event description
 * @param {string} startTime - Start time in ISO format
 * @param {string} endTime - End time in ISO format
 * @param {Array<string>} attendeesEmailArr - Array of attendee emails
 */
export const updateTeamsMeetingOccurrence = async (
    occurrenceId,
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

        const URL = `https://graph.microsoft.com/v1.0/me/events/${occurrenceId}`;
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
                    timeZone: 'Australia/Sydney',
                },
                end: {
                    dateTime: endTime,
                    timeZone: 'Australia/Sydney',
                },
                attendees: attendeesEmailArr.map((email) => ({
                    emailAddress: {
                        address: email,
                    },
                    type: 'required',
                })),
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to update occurrence: ${error.error?.message || response.statusText}`,
            );
        }

        const meeting = await response.json();
        return meeting;
    } catch (error) {
        console.error('Error updating Teams meeting occurrence:', error);
        throw new Error(error.message || 'Failed to update Teams meeting occurrence');
    }
};

/**
 * Delete a single occurrence from a recurring Teams meeting
 * @param {string} occurrenceId - The occurrence ID (not seriesMasterId)
 */
export const deleteTeamsMeetingOccurrence = async (occurrenceId) => {
    try {
        const session = await getSession();
        const accessToken = session?.user?.microsoftAccessToken;

        if (!accessToken) {
            throw new Error('Microsoft access token not found');
        }

        const URL = `https://graph.microsoft.com/v1.0/me/events/${occurrenceId}`;
        const response = await fetch(URL, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok && response.status !== 404) {
            const error = await response.json();
            throw new Error(
                `Failed to delete occurrence: ${error.error?.message || response.statusText}`,
            );
        }

        return true;
    } catch (error) {
        console.error('Error deleting Teams meeting occurrence:', error);
        throw new Error(error.message || 'Failed to delete Teams meeting occurrence');
    }
};
