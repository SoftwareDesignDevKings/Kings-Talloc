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
            return await handleMicrosoftAction(req, "DEV_MODE_MOCK_TOKEN");
        }

        // PRODUCTION: resolve valid MS access token from JWT
        const msAccessToken = await getMicrosoftAccessToken(token);
        if (!msAccessToken) {
            return NextResponse.json({ error: "REAUTH_REQUIRED", message: "Microsoft authentication required. Please sign in again." }, { status: 401 });
        }

        return await handleMicrosoftAction(req, msAccessToken);

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

        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        return NextResponse.json({ success: true, data: result }, { status: 200 });
    } catch (error) {
        console.error(`[MS Proxy] Action handler error:`, error);
        throw error;
    }
}

async function getMicrosoftAccessToken(token) {
    if (!token?.msRefreshToken) return null;

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
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.AZURE_AD_CLIENT_ID,
                client_secret: process.env.AZURE_AD_CLIENT_SECRET,
                grant_type: "refresh_token",
                refresh_token: msRefreshToken,
                scope: "openid profile email offline_access User.Read Calendars.ReadWrite Mail.Send",
            }),
        }
    );

    if (!response.ok) {
        console.error("[MS Proxy] Token refresh failed:", await response.text());
        return null;
    }

    const tokenData = await response.json();
    return tokenData.access_token;
}