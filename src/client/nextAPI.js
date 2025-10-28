/**
 * Client-side API functions for making requests to Next.js backend routes
 * Hence, next* for functions that call Next.js Server APIs requiring server level security (e.g. creating timeseheets)
 */


/**
 * Generic API request wrapper for Next.js server
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Fetch options
 * @param {string} options.method - HTTP method (GET, POST, etc.)
 * @param {Object} options.body - Request body (will be JSON stringified)
 * @param {Object} options.headers - Additional headers
 * @returns {Promise<Response>} The fetch response
 * @throws {Error} If the request fails
 */
const requestNextServer = async (endpoint, options = {}) => {
    try {
        const { method, body, headers = {}, ...rest } = options;

        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            ...rest,
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        const response = await fetch(endpoint, config);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        return response;
    } catch (error) {
        console.error(`Error in requestNextServer for ${endpoint}:`, error);
        throw error;
    }
};

/**
 * Sends queued emails
 * @returns {Promise<Response>} The fetch response
 */
export const nextSendQueuedEmails = async () => {
    return await requestNextServer('/api/send-emails/send');
};

/**
 * Generates a timesheet document for a tutor
 * @param {Object} params - Timesheet parameters
 * @param {string} params.tutorEmail - The tutor's email
 * @param {string} params.tutorName - The tutor's name
 * @param {Object} params.hoursData - Hours data by day
 * @param {number} params.excludedHoursTotal - Total hours excluded from timesheet
 * @param {string} params.role - The role (e.g. 'Academic Tutor', 'Coach')
 * @returns {Promise<Blob>} Binary file data for download
 */
export const nextGenerateTimesheet = async ({ tutorEmail, tutorName, hoursData, excludedHoursTotal, role }) => {
    const response = await requestNextServer('/api/timesheet', {
        method: 'POST',
        body: { tutorEmail, tutorName, hoursData, excludedHoursTotal, role },
    });

    return await response.blob();
    // blob is the binary file 
};

/**
 * Sends an event (currently commented out in codebase)
 * @param {Object} eventData - Event data to send
 * @returns {Promise<Response>} The fetch response
 */
export const nextSendEvent = async (eventData) => {
    return await requestNextServer('/api/send-event', {
        method: 'POST',
        body: eventData,
    });
};
