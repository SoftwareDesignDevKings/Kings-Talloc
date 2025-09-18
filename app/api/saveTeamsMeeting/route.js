import { NextResponse } from "next/server";
import admin from "firebase-admin";
import serviceAccount from "../../../firebase/serviceAccountKey.json"; // adjust path if needed

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export async function POST(req) {
  try {
    // security check
    const secret = req.headers.get("firebase-api-secret");
    if (secret !== process.env.FIREBASE_API_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId, msTeamsMeetingId } = await req.json();
    if (!eventId || !msTeamsMeetingId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await db.collection("msTeamsMeetings").doc(eventId).set({
      eventId,
      msTeamsMeetingId,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
