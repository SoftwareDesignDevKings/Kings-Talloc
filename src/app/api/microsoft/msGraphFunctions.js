/**
 * ==========================================
 * MICROSOFT GRAPH API - SERVER-SIDE ONLY
 * ==========================================
 * All Microsoft Graph operations are contained in this file.
 * These functions should NEVER be imported by client-side code.
 * Only import from other API routes (server-side).
 */

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const TIMEZONE = 'Australia/Sydney';
const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

/**
 * Check if running in dev mode with mock token
 */
const isDevMode = (accessToken) => {
    return isDev && accessToken === 'DEV_MODE_MOCK_TOKEN';
};

/**
 * Helper: Build request headers with access token
 */
const buildHeaders = (accessToken, includeContentType = true) => {
    const headers = {
        Authorization: `Bearer ${accessToken}`,
    };
    if (includeContentType) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
};

/**
 * Helper: Build event body for create/update operations
 */
const buildEventBody = (subject, description, startTime, endTime, attendeesEmailArr, recurrenceOptions = null) => {
    const eventBody = {
        subject: subject,
        body: {
            contentType: 'HTML',
            content: description || '',
        },
        start: {
            dateTime: startTime,
            timeZone: TIMEZONE,
        },
        end: {
            dateTime: endTime,
            timeZone: TIMEZONE,
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
            endDate.setMonth(endDate.getMonth() + 3); // 3 months default
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

    return eventBody;
};

/**
 * ==========================================
 * CALENDAR EVENT OPERATIONS
 * ==========================================
 */

/**
 * Create a Teams meeting event
 * @param {string} accessToken - Microsoft access token
 * @param {Object} eventData - Event details
 * @returns {Promise<{teamsEventId: string, joinUrl: string}>}
 */
export const msCreateEvent = async (accessToken, { subject, description, startTime, endTime, attendees, recurrenceOptions = null }) => {
    try {
        if (isDevMode(accessToken)) {
            console.log('[msGraph] DEV MODE: Mocking create-event for:', subject);
            return {
                teamsEventId: `dev-event-${Date.now()}`,
                joinUrl: 'https://teams.microsoft.com/l/meetup-join/dev-mock-meeting',
            };
        }

        const eventBody = buildEventBody(subject, description, startTime, endTime, attendees, recurrenceOptions);

        // Add Teams meeting provider
        eventBody.isOnlineMeeting = true;
        eventBody.onlineMeetingProvider = 'teamsForBusiness';

        const response = await fetch(`${GRAPH_BASE_URL}/me/events`, {
            method: 'POST',
            headers: buildHeaders(accessToken),
            body: JSON.stringify(eventBody),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to create Teams meeting: ${error.error?.message || response.statusText}`,
            );
        }

        const meeting = await response.json();

        // Set auto-recording in the background (non-blocking)
        if (meeting.onlineMeeting?.id) {
            msSetAutoRecord(accessToken, meeting.onlineMeeting.id).catch((autoRecordError) => {
                console.warn(
                    `[msGraph] Could not set auto-recording for Teams meeting ${meeting.id}:`,
                    autoRecordError.message
                );
            });
        }

        return {
            teamsEventId: meeting.id,
            joinUrl: meeting.onlineMeeting?.joinUrl,
        };
    } catch (error) {
        console.error('[msGraph] Error creating Teams meeting:', error);
        throw error;
    }
};

/**
 * Update an existing Teams meeting event
 * @param {string} accessToken - Microsoft access token
 * @param {string} eventId - Microsoft Graph event ID
 * @param {Object} eventData - Updated event details
 * @returns {Promise<Object>} Updated meeting object
 */
export const msUpdateEvent = async (accessToken, eventId, { subject, description, startTime, endTime, attendees, recurrenceOptions = null }) => {
    try {
        // DEV MODE: Return mock response
        if (isDevMode(accessToken)) {
            console.log('[msGraph] DEV MODE: Mocking update-event for:', eventId);
            return { id: eventId, subject, updated: true };
        }

        const eventBody = buildEventBody(subject, description, startTime, endTime, attendees, recurrenceOptions);

        const response = await fetch(`${GRAPH_BASE_URL}/me/events/${eventId}`, {
            method: 'PATCH',
            headers: buildHeaders(accessToken),
            body: JSON.stringify(eventBody),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to update Teams meeting: ${error.error?.message || response.statusText}`,
            );
        }

        return await response.json();
    } catch (error) {
        console.error('[msGraph] Error updating Teams meeting:', error);
        throw error;
    }
};

/**
 * Delete a Teams meeting event
 * @param {string} accessToken - Microsoft access token
 * @param {string} eventId - Microsoft Graph event ID
 * @returns {Promise<boolean>}
 */
export const msDeleteEvent = async (accessToken, eventId) => {
    try {
        // DEV MODE: Return mock response
        if (isDevMode(accessToken)) {
            console.log('[msGraph] DEV MODE: Mocking delete-event for:', eventId);
            return true;
        }

        const response = await fetch(`${GRAPH_BASE_URL}/me/events/${eventId}`, {
            method: 'DELETE',
            headers: buildHeaders(accessToken, false),
        });

        if (!response.ok && response.status !== 404) {
            const error = await response.json();
            throw new Error(
                `Failed to delete Teams meeting: ${error.error?.message || response.statusText}`,
            );
        }

        return true;
    } catch (error) {
        console.error('[msGraph] Error deleting Teams meeting:', error);
        throw error;
    }
};

/**
 * Get event details
 * @param {string} accessToken - Microsoft access token
 * @param {string} eventId - Microsoft Graph event ID
 * @returns {Promise<Object>} Event object
 */
export const msGetEvent = async (accessToken, eventId) => {
    try {
        const response = await fetch(`${GRAPH_BASE_URL}/me/events/${eventId}`, {
            method: 'GET',
            headers: buildHeaders(accessToken, false),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to get event: ${error.error?.message || response.statusText}`,
            );
        }

        return await response.json();
    } catch (error) {
        console.error('[msGraph] Error getting event:', error);
        throw error;
    }
};

/**
 * ==========================================
 * RECURRING EVENT OPERATIONS
 * ==========================================
 */

/**
 * Get occurrence ID for a specific instance in a recurring series
 * @param {string} accessToken - Microsoft access token
 * @param {string} seriesMasterId - The series master ID
 * @param {Date} occurrenceDate - The date of the occurrence
 * @returns {Promise<string>} Occurrence ID
 */
export const msGetOccurrenceId = async (accessToken, seriesMasterId, occurrenceDate) => {
    try {
        const startDateTime = new Date(occurrenceDate);
        startDateTime.setHours(0, 0, 0, 0);
        const endDateTime = new Date(occurrenceDate);
        endDateTime.setHours(23, 59, 59, 999);

        const url = `${GRAPH_BASE_URL}/me/events/${seriesMasterId}/instances?startDateTime=${startDateTime.toISOString()}&endDateTime=${endDateTime.toISOString()}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: buildHeaders(accessToken, false),
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
        console.error('[msGraph] Error getting occurrence ID:', error);
        throw error;
    }
};

/**
 * Update a single occurrence in a recurring Teams meeting series
 * @param {string} accessToken - Microsoft access token
 * @param {string} occurrenceId - The occurrence ID (not seriesMasterId)
 * @param {Object} eventData - Updated event details
 * @returns {Promise<Object>} Updated occurrence object
 */
export const msUpdateOccurrence = async (accessToken, occurrenceId, { subject, description, startTime, endTime, attendees }) => {
    try {
        const response = await fetch(`${GRAPH_BASE_URL}/me/events/${occurrenceId}`, {
            method: 'PATCH',
            headers: buildHeaders(accessToken),
            body: JSON.stringify({
                subject: subject,
                body: {
                    contentType: 'HTML',
                    content: description || '',
                },
                start: {
                    dateTime: startTime,
                    timeZone: TIMEZONE,
                },
                end: {
                    dateTime: endTime,
                    timeZone: TIMEZONE,
                },
                attendees: attendees.map((email) => ({
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

        return await response.json();
    } catch (error) {
        console.error('[msGraph] Error updating Teams meeting occurrence:', error);
        throw error;
    }
};

/**
 * Delete a single occurrence from a recurring Teams meeting
 * @param {string} accessToken - Microsoft access token
 * @param {string} occurrenceId - The occurrence ID (not seriesMasterId)
 * @returns {Promise<boolean>}
 */
export const msDeleteOccurrence = async (accessToken, occurrenceId) => {
    try {
        const response = await fetch(`${GRAPH_BASE_URL}/me/events/${occurrenceId}`, {
            method: 'DELETE',
            headers: buildHeaders(accessToken, false),
        });

        if (!response.ok && response.status !== 404) {
            const error = await response.json();
            throw new Error(
                `Failed to delete occurrence: ${error.error?.message || response.statusText}`,
            );
        }

        return true;
    } catch (error) {
        console.error('[msGraph] Error deleting Teams meeting occurrence:', error);
        throw error;
    }
};

/**
 * Update recurrence end date for a recurring Teams meeting (to delete future occurrences)
 * @param {string} accessToken - Microsoft access token
 * @param {string} seriesMasterId - The series master ID
 * @param {Date} newEndDate - New end date for the series
 * @returns {Promise<boolean>}
 */
export const msUpdateRecurrenceEnd = async (accessToken, seriesMasterId, newEndDate) => {
    try {
        // Get the existing event to preserve the recurrence pattern
        const existingEvent = await msGetEvent(accessToken, seriesMasterId);

        if (!existingEvent.recurrence) {
            throw new Error('Event is not recurring');
        }

        // Update only the recurrence end date
        const response = await fetch(`${GRAPH_BASE_URL}/me/events/${seriesMasterId}`, {
            method: 'PATCH',
            headers: buildHeaders(accessToken),
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
        console.error('[msGraph] Error updating recurrence end date:', error);
        throw error;
    }
};

/**
 * ==========================================
 * TEAMS MEETING CONFIGURATION
 * ==========================================
 */

/**
 * Set auto-record for a Teams meeting
 * @param {string} accessToken - Microsoft access token
 * @param {string} onlineMeetingId - Online meeting ID
 * @returns {Promise<boolean>}
 */
export const msSetAutoRecord = async (accessToken, onlineMeetingId) => {
    try {
        const response = await fetch(`${GRAPH_BASE_URL}/me/onlineMeetings/${onlineMeetingId}`, {
            method: 'PATCH',
            headers: buildHeaders(accessToken),
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
        console.error('[msGraph] Error setting auto-record for Teams meeting:', error);
        throw error;
    }
};

/**
 * ==========================================
 * EMAIL OPERATIONS
 * ==========================================
 */

/**
 * Send email via Microsoft Graph
 * @param {string} accessToken - Microsoft access token
 * @param {Object} emailData - Email details
 * @returns {Promise<boolean>}
 */
export const msSendEmail = async (accessToken, { to, subject, htmlContent, saveToSentItems = true }) => {
    try {
        // DEV MODE: Return mock response
        if (isDevMode(accessToken)) {
            const recipients = Array.isArray(to) ? to.join(', ') : to;
            console.log('[msGraph] DEV MODE: Mocking send-email to:', recipients, 'subject:', subject);
            return true;
        }

        // Build recipients array
        const toRecipients = [];
        for (const email of to) {
            toRecipients.push({ emailAddress: { address: email } });
        }

        const response = await fetch(`${GRAPH_BASE_URL}/me/sendMail`, {
            method: 'POST',
            headers: buildHeaders(accessToken),
            body: JSON.stringify({
                message: {
                    subject,
                    body: {
                        contentType: 'HTML',
                        content: htmlContent,
                    },
                    toRecipients,
                },
                saveToSentItems,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Failed to send email: ${error.error?.message || response.statusText}`,
            );
        }

        return true;
    } catch (error) {
        console.error('[msGraph] Error sending email:', error);
        throw error;
    }
};
