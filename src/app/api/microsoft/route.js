import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
    msCreateEvent,
    msUpdateEvent,
    msDeleteEvent,
    msGetEvent,
    msGetOccurrenceId,
    msUpdateOccurrence,
    msDeleteOccurrence,
    msUpdateRecurrenceEnd,
    msSetAutoRecord,
    msSendEmail,
} from "./msGraphFunctions";

/**
 * Microsoft Graph API Proxy Endpoint
 * Handles all Microsoft Graph operations with centralized token management
 *
 * Actions:
 * - create-event: Create Teams meeting event
 * - update-event: Update Teams meeting event
 * - delete-event: Delete Teams meeting event
 * - get-event: Get event details
 * - get-occurrence-id: Get occurrence ID for recurring event
 * - update-occurrence: Update single occurrence in recurring series
 * - delete-occurrence: Delete single occurrence in recurring series
 * - update-recurrence-end: Update recurrence end date
 * - set-auto-record: Enable auto-recording for Teams meeting
 * - send-email: Send email via Microsoft Graph
 */
export async function POST(req) {
    try {
        // Validate JWT token
        const token = await getToken({ req });
        if (!token) {
            return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
        }

        // DEV MODE: Skip Microsoft token validation in development/test environments
        const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
        if (isDev) {
            console.log("[MS Proxy] Running in DEV mode - using mock responses");
            const accessToken = "DEV_MODE_MOCK_TOKEN";
            return await handleMicrosoftAction(req, accessToken);
        }

        // PRODUCTION: Check for Microsoft refresh token
        if (!token.microsoftRefreshToken) {
            return NextResponse.json(
                {
                    error: "REFRESH_TOKEN_MISSING",
                    message: "Microsoft authentication required. Please sign in again.",
                },
                { status: 401 }
            );
        }

        // Get access token and check expiration
        let accessToken = token.microsoftAccessToken;
        const isExpired = Date.now() > token.microsoftTokenExpiry;

        if (isExpired) {
            console.log("[MS Proxy] Access token expired, refreshing...");

            try {
                accessToken = await refreshMicrosoftToken(token.microsoftRefreshToken);

                // TODO: Update the token in NextAuth session
                // For now, we use the refreshed token for this request only
                
                // TODO: if refresh token expired, redirect to login page to reauthenticate and repopulate this accessToken field. 
            } catch (refreshError) {
                console.error("[MS Proxy] Token refresh failed:", refreshError);
                return NextResponse.json(
                    {
                        error: "TOKEN_REFRESH_FAILED",
                        message: "Unable to refresh Microsoft access token. Please sign in again.",
                    },
                    { status: 401 }
                );
            }
        }

        return await handleMicrosoftAction(req, accessToken);

    } catch (error) {
        console.error(`[MS Proxy] Error:`, error);

        // Return user-friendly error message
        return NextResponse.json(
            {
                error: "MICROSOFT_GRAPH_ERROR",
                message: error.message || "An error occurred while communicating with Microsoft Graph",
            },
            { status: 500 }
        );
    }
}

/**
 * Handle Microsoft Graph action routing
 * @param {Request} req - Request object
 * @param {string} accessToken - Microsoft access token (or mock token in dev)
 */
async function handleMicrosoftAction(req, accessToken) {
    try {
        // Get action from query params
        const { searchParams } = new URL(req.url);
        const action = searchParams.get("action");

        if (!action) {
            return NextResponse.json({ error: "Missing action parameter" }, { status: 400 });
        }

        // Parse request body
        const body = await req.json();

        // Route to appropriate Microsoft Graph function
        let result;

        if (action === "create-event") {
            result = await msCreateEvent(accessToken, body);

        } else if (action === "update-event") {
            if (!body.eventId) {
                return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
            }
            result = await msUpdateEvent(accessToken, body.eventId, body);

        } else if (action === "delete-event") {
            if (!body.eventId) {
                return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
            }
            result = await msDeleteEvent(accessToken, body.eventId);

        } else if (action === "get-event") {
            if (!body.eventId) {
                return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
            }
            result = await msGetEvent(accessToken, body.eventId);

        } else if (action === "get-occurrence-id") {
            if (!body.seriesMasterId || !body.occurrenceDate) {
                return NextResponse.json(
                    { error: "Missing seriesMasterId or occurrenceDate" },
                    { status: 400 }
                );
            }
            result = await msGetOccurrenceId(
                accessToken,
                body.seriesMasterId,
                new Date(body.occurrenceDate)
            );

        } else if (action === "update-occurrence") {
            if (!body.occurrenceId) {
                return NextResponse.json({ error: "Missing occurrenceId" }, { status: 400 });
            }
            result = await msUpdateOccurrence(accessToken, body.occurrenceId, body);

        } else if (action === "delete-occurrence") {
            if (!body.occurrenceId) {
                return NextResponse.json({ error: "Missing occurrenceId" }, { status: 400 });
            }
            result = await msDeleteOccurrence(accessToken, body.occurrenceId);

        } else if (action === "update-recurrence-end") {
            if (!body.seriesMasterId || !body.newEndDate) {
                return NextResponse.json(
                    { error: "Missing seriesMasterId or newEndDate" },
                    { status: 400 }
                );
            }
            result = await msUpdateRecurrenceEnd(
                accessToken,
                body.seriesMasterId,
                new Date(body.newEndDate)
            );

        } else if (action === "set-auto-record") {
            if (!body.onlineMeetingId) {
                return NextResponse.json({ error: "Missing onlineMeetingId" }, { status: 400 });
            }
            result = await msSetAutoRecord(accessToken, body.onlineMeetingId);

        } else if (action === "send-email") {
            if (!body.to || !body.subject || !body.htmlContent) {
                return NextResponse.json(
                    { error: "Missing required email fields (to, subject, htmlContent)" },
                    { status: 400 }
                );
            }
            // 
            // msSendEmail - implement later. 

            // result = await msSendEmail(accessToken, body);
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        return NextResponse.json({ success: true, data: result }, { status: 200 });
    } catch (error) {
        console.error(`[MS Proxy] Action handler error:`, error);
        throw error;
    }
}

/**
 * Refresh Microsoft access token using refresh token
 * @param {string} refreshToken - Microsoft refresh token
 * @returns {Promise<string>} New access token
 */
async function refreshMicrosoftToken(refreshToken) {
    const AZURE_AD_TENANT_ID = process.env.AZURE_AD_TENANT_ID;
    const AZURE_AD_CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
    const AZURE_AD_CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;

    const response = await fetch(
        `https://login.microsoftonline.com/${AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: AZURE_AD_CLIENT_ID,
                client_secret: AZURE_AD_CLIENT_SECRET,
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                scope: "openid profile email offline_access User.Read Calendars.ReadWrite Mail.Send",
            }),
        }
    );

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to refresh token: ${errorData.error_description || response.statusText}`);
    }

    const tokens = await response.json();
    return tokens.access_token;
}