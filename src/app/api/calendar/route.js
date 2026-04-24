import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
// import { authOptions } from "@lib/security/auth";
// import { adminDb } from "@/firestore/adminFirebase";
import { adminDb } from "@/firestore/firestoreAdmin";
import { authOptions } from "@/lib/security/authConfig";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const uid = session.user.email;
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) {
        return NextResponse.json({ error: "User missing" }, { status: 404 });
    }

    let { calendarFeedToken } = userDoc.data() || {};

    // Generate a token if one doesn't exist
    if (!calendarFeedToken) {
        calendarFeedToken = crypto.randomUUID();
        await adminDb.collection("users").doc(uid).update({ calendarFeedToken });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://talloc.kings.edu.au';
    const httpsUrl = `${baseUrl}/api/calendar/feed?uid=${uid}&token=${calendarFeedToken}`;
    const webcalUrl = httpsUrl.replace("https://", "webcal://");

    return NextResponse.json({
        httpsUrl,
        webcalUrl
    });
}
