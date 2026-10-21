import { NextResponse } from "next/server";
import { adminDb } from "@/firestore/firestoreAdmin";
import { getCachedCurrentAccount, validAccountEmail } from "@/lib/security/accountState";
import { emailOf } from '@/lib/scheduling/eventRules';
import { timingSafeEqual } from "crypto";

function formatICSDate(date) {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICSText(text) {
    if (!text) return "";
    return text
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\n/g, "\\n");
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");
    const token = searchParams.get("token");

    if (!uid || !token) {
        return NextResponse.json({ error: "Missing uid or token" }, { status: 400 });
    }

    if (!validAccountEmail(uid) || !/^[a-f0-9]{64}$/.test(token)) {
        return NextResponse.json({ error: 'Invalid calendar link' }, { status: 401 });
    }
    // Check the link's secret (one read) before any account lookup, so a guessed
    // uid/token pair can't trigger profile reads.
    const data = (await adminDb.collection('calendarFeedSecrets').doc(uid).get()).data();
    if (typeof data?.token !== 'string' || !/^[a-f0-9]{64}$/.test(data.token)
        || !timingSafeEqual(Buffer.from(data.token), Buffer.from(token))) {
        return NextResponse.json({ error: 'Invalid calendar link' }, { status: 401 });
    }
    const account = await getCachedCurrentAccount(uid);
    if (!account || data.authVersion !== account.authVersion) {
        return NextResponse.json({ error: 'Invalid calendar link' }, { status: 401 });
    }

    // Fetch shifts where user is a participant (staff or student). Calendar clients
    // refresh this feed around the clock, so read only the user's shifts through the
    // same emailsList index the in-app calendar uses, never the whole collection.
    const aliases = [...new Set([uid.toLowerCase(), account.email])];
    const eventsSnapshot = await adminDb.collection("shifts").where("emailsList", "array-contains-any", aliases).get();
    const events = [];

    eventsSnapshot.forEach((doc) => {
        const data = doc.data();
        const event = { id: doc.id, ...data };
        const staff = data.staff || [];
        const students = data.students || [];

        const isParticipant =
            staff.some((s) => emailOf(s) === uid.toLowerCase()) ||
            students.some((s) => emailOf(s) === uid.toLowerCase());

        if (isParticipant) {
            events.push(event);
        }
    });

    // Build iCalendar content
    const now = new Date();
    let icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Kings-Talloc//TKS Tutor Allocation//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        `X-WR-CALNAME:Kings-Talloc Events`,
    ];

    for (const event of events) {
        const start = event.start?.toDate ? event.start.toDate() : new Date(event.start);
        const end = event.end?.toDate ? event.end.toDate() : new Date(event.end);

        const vevent = [
            "BEGIN:VEVENT",
            `UID:${event.id}@talloc.kings.edu.au`,
            `DTSTAMP:${formatICSDate(now)}`,
            `DTSTART:${formatICSDate(start)}`,
            `DTEND:${formatICSDate(end)}`,
            `SUMMARY:${escapeICSText(event.title || "Untitled Event")}`,
        ];

        if (event.description) {
            vevent.push(`DESCRIPTION:${escapeICSText(event.description)}`);
        }

        if (event.locationType) {
            vevent.push(`LOCATION:${escapeICSText(event.locationType)}`);
        }

        if (event.teamsJoinUrl) {
            vevent.push(`URL:${event.teamsJoinUrl}`);
        }

        vevent.push("END:VEVENT");
        icsContent.push(...vevent);
    }

    icsContent.push("END:VCALENDAR");

    return new NextResponse(icsContent.join("\r\n"), {
        headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Cache-Control": "private, no-store",
            "Referrer-Policy": "no-referrer",
            "Content-Disposition": 'attachment; filename="kings-talloc.ics"',
        },
    });
}
