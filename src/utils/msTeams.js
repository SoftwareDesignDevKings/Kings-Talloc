/**
 * Microsoft Teams Utilities - Client-side proxy wrapper
 * All functions now route through /api/microsoft proxy endpoint for security
 * This removes session token management from client-side code
 */

const MS_API_ENDPOINT = '/api/microsoft';

/**
 * Helper: Make a request to the Microsoft proxy endpoint
 */
const fetchMSProxy = async (action, body) => {
    const response = await fetch(`${MS_API_ENDPOINT}?action=${action}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
        // Handle specific error cases
        if (data.error === 'REFRESH_TOKEN_MISSING' || data.error === 'TOKEN_REFRESH_FAILED') {
            throw new Error('Microsoft authentication expired. Please sign out and sign in again.');
        }
        throw new Error(data.message || data.error || 'Microsoft Graph request failed');
    }

    return data.data;
};

/**
 * Set auto-record for a Teams meeting
 * @param {string} onlineMeetingId - Online meeting ID
 * @returns {Promise<boolean>}
 */
export const setTeamsMeetingAutoRecord = async (onlineMeetingId) => {
    try {
        await fetchMSProxy('set-auto-record', { onlineMeetingId });
        return true;
    } catch (error) {
        console.error('[msTeams] Error setting auto-record for Teams meeting:', error);
        throw error;
    }
};

/**
 * Creates a MS Teams meeting via Microsoft Graph API
 * @param {string} subject - Event title
 * @param {string} description - Event description
 * @param {string} startTime - Start time in ISO format
 * @param {string} endTime - End time in ISO format
 * @param {Array<string>} attendeesEmailArr - Array of attendee emails
 * @param {Object} recurrenceOptions - Optional recurrence configuration
 * @param {string} recurrenceOptions.recurring - 'weekly' or 'fortnightly'
 * @param {Date} recurrenceOptions.until - End date for recurrence
 * @returns {Promise<{teamsEventId: string, joinUrl: string}>}
 */
export const createTeamsMeeting = async (
    subject,
    description,
    startTime,
    endTime,
    attendeesEmailArr,
    recurrenceOptions = null
) => {
    try {
        const result = await fetchMSProxy('create-event', {
            subject,
            description,
            startTime,
            endTime,
            attendees: attendeesEmailArr,
            recurrenceOptions,
        });

        return {
            teamsEventId: result.teamsEventId,
            joinUrl: result.joinUrl,
        };
    } catch (error) {
        console.error('[msTeams] Error creating Teams meeting:', error);
        throw error;
    }
};

/**
 * Update an existing Teams meeting
 * @param {string} eventId - Microsoft Graph event ID
 * @param {string} subject - Event title
 * @param {string} description - Event description
 * @param {string} startTime - Start time in ISO format
 * @param {string} endTime - End time in ISO format
 * @param {Array<string>} attendeesEmailArr - Array of attendee emails
 * @param {Object} recurrenceOptions - Optional recurrence configuration
 * @returns {Promise<Object>} Updated meeting object
 */
export const updateTeamsMeeting = async (
    eventId,
    subject,
    description,
    startTime,
    endTime,
    attendeesEmailArr,
    recurrenceOptions = null
) => {
    try {
        const result = await fetchMSProxy('update-event', {
            eventId,
            subject,
            description,
            startTime,
            endTime,
            attendees: attendeesEmailArr,
            recurrenceOptions,
        });

        return result;
    } catch (error) {
        console.error('[msTeams] Error updating Teams meeting:', error);
        throw error;
    }
};

/**
 * Delete a Teams meeting
 * @param {string} eventId - Microsoft Graph event ID
 * @returns {Promise<boolean>}
 */
export const deleteTeamsMeeting = async (eventId) => {
    try {
        await fetchMSProxy('delete-event', { eventId });
        return true;
    } catch (error) {
        console.error('[msTeams] Error deleting Teams meeting:', error);
        throw error;
    }
};

/**
 * Update recurrence end date for a recurring Teams meeting (to delete future occurrences)
 * @param {string} seriesMasterId - The series master ID
 * @param {Date} newEndDate - New end date for the series
 * @returns {Promise<boolean>}
 */
export const updateTeamsMeetingRecurrenceEndDate = async (seriesMasterId, newEndDate) => {
    try {
        await fetchMSProxy('update-recurrence-end', {
            seriesMasterId,
            newEndDate: newEndDate.toISOString(),
        });

        return true;
    } catch (error) {
        console.error('[msTeams] Error updating recurrence end date:', error);
        throw error;
    }
};

/**
 * Get occurrence ID for a specific instance in a recurring series
 * This is needed to update/delete a single occurrence
 * @param {string} seriesMasterId - The series master ID
 * @param {Date} occurrenceDate - The date of the occurrence
 * @returns {Promise<string>} Occurrence ID
 */
export const getTeamsMeetingOccurrenceId = async (seriesMasterId, occurrenceDate) => {
    try {
        const occurrenceId = await fetchMSProxy('get-occurrence-id', {
            seriesMasterId,
            occurrenceDate: occurrenceDate.toISOString(),
        });

        return occurrenceId;
    } catch (error) {
        console.error('[msTeams] Error getting occurrence ID:', error);
        throw error;
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
 * @returns {Promise<Object>} Updated occurrence object
 */
export const updateTeamsMeetingOccurrence = async (
    occurrenceId,
    subject,
    description,
    startTime,
    endTime,
    attendeesEmailArr
) => {
    try {
        const result = await fetchMSProxy('update-occurrence', {
            occurrenceId,
            subject,
            description,
            startTime,
            endTime,
            attendees: attendeesEmailArr,
        });

        return result;
    } catch (error) {
        console.error('[msTeams] Error updating Teams meeting occurrence:', error);
        throw error;
    }
};

/**
 * Delete a single occurrence from a recurring Teams meeting
 * @param {string} occurrenceId - The occurrence ID (not seriesMasterId)
 * @returns {Promise<boolean>}
 */
export const deleteTeamsMeetingOccurrence = async (occurrenceId) => {
    try {
        await fetchMSProxy('delete-occurrence', { occurrenceId });
        return true;
    } catch (error) {
        console.error('[msTeams] Error deleting Teams meeting occurrence:', error);
        throw error;
    }
};
