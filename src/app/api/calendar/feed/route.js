import { NextResponse } from "next/server";
import { adminDb } from "@/firestore/firestoreAdmin";
import { getCurrentAccount, validAccountEmail } from "@/lib/security/accountState";
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
    const [account, secret] = await Promise.all([
        getCurrentAccount(uid), adminDb.collection('calendarFeedSecrets').doc(uid).get(),
    ]);
    const data = secret.data();
    if (!account || data?.authVersion !== account.authVersion || typeof data.token !== 'string'
        || !/^[a-f0-9]{64}$/.test(data.token) || !timingSafeEqual(Buffer.from(data.token), Buffer.from(token))) {
        return NextResponse.json({ error: 'Invalid calendar link' }, { status: 401 });
    }

    // Fetch shifts where user is a participant (staff or student)
    const eventsSnapshot = await adminDb.collection("shifts").get();
    const events = [];

    eventsSnapshot.forEach((doc) => {
        const data = doc.data();
        const event = { id: doc.id, ...data };
        const staff = data.staff || [];
        const students = data.students || [];

        const isParticipant =
            staff.some((s) => (s.value || s) === uid) ||
            students.some((s) => (s.value || s) === uid);

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
