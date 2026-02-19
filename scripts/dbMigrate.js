/**
 * Migration script:
 *
 * USERS collection:
 *   - Copies: role -> defaultRole
 *   - Ensures: userRoles is an array (defaults to [])
 *   - Does NOT remove role (so prod won't break)
 *
 * SHIFTS collection:
 *   - Backfills: emailsList = flat array of all staff + student emails for Firestore querying
 *
 * STUDENT EVENT REQUESTS collection:
 *   - Backfills: emailsList = flat array of student emails for Firestore querying
 *
 * Env:
 *   FIREBASE_SERVICE_ACCOUNT_KEY = base64(JSON service account)
 */

require("dotenv").config();

const admin = require("firebase-admin");

function getServiceAccountFromEnv() {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!b64) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY (base64).");

    const jsonStr = Buffer.from(b64, "base64").toString("utf8").trim();
    if (!jsonStr) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY decoded to empty string.");

    let parsed;
    try {
        parsed = JSON.parse(jsonStr);
    } catch (e) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not valid base64(JSON).");
    }

    if (parsed.private_key && typeof parsed.private_key === "string") {
        parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }

    return parsed;
}

async function commitBatchSafely(db, updates) {
    const MAX_OPS = 450; // under 500 limit
    let committed = 0;

    for (let i = 0; i < updates.length; i += MAX_OPS) {
        const slice = updates.slice(i, i + MAX_OPS);
        const batch = db.batch();
        for (const { ref, data } of slice) batch.update(ref, data);
        await batch.commit();
        committed += slice.length;
        console.log(`🧾 Committed batch: ${committed}/${updates.length}`);
    }
}

async function migrateShiftsEmailsList() {
    console.log("\n\nStarting shifts emailsList migration...\n");

    const serviceAccount = getServiceAccountFromEnv();

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }

    const db = admin.firestore();
    const snap = await db.collection("shifts").get();

    if (snap.empty) {
        console.log("No shifts found.");
        return;
    }

    console.log(`Found ${snap.size} shifts.\n`);

    const updates = [];
    let skipped = 0;

    for (const document of snap.docs) {
        const data = document.data() || {};

        const staffEmails = (data.staff || [])
            .map(s => (s && typeof s === "object" ? s.value : s))
            .filter(v => typeof v === "string" && v.includes("@"));

        const studentEmails = (data.students || [])
            .map(s => (s && typeof s === "object" ? s.value : s))
            .filter(v => typeof v === "string" && v.includes("@"));

        const emailsList = [...new Set([...staffEmails, ...studentEmails])];

        // Skip if emailsList already matches
        const existing = data.emailsList || [];
        const alreadyCorrect =
            emailsList.length === existing.length &&
            emailsList.every(e => existing.includes(e));

        if (alreadyCorrect) {
            skipped++;
            continue;
        }

        updates.push({ ref: document.ref, data: { emailsList } });
        console.log(`✅ ${document.id}: emailsList=[${emailsList.join(", ")}]`);
    }

    if (updates.length === 0) {
        console.log(`\nAll shifts already have emailsList. (skipped ${skipped})`);
        return;
    }

    console.log(`\nAbout to update ${updates.length} shifts (skipped ${skipped}).\n`);
    await commitBatchSafely(db, updates);
    console.log(`\n🎉 emailsList migration complete! Updated ${updates.length} shifts.`);
}

async function migrateStudentRequestsEmailsList() {
    console.log("\n\nStarting studentEventRequests emailsList migration...\n");

    const serviceAccount = getServiceAccountFromEnv();

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }

    const db = admin.firestore();
    const snap = await db.collection("studentEventRequests").get();

    if (snap.empty) {
        console.log("No student requests found.");
        return;
    }

    console.log(`Found ${snap.size} student requests.\n`);

    const updates = [];
    let skipped = 0;

    for (const document of snap.docs) {
        const data = document.data() || {};

        const emailsList = (data.students || [])
            .map(s => (s && typeof s === "object" ? s.value : s))
            .filter(v => typeof v === "string" && v.includes("@"));

        const existing = data.emailsList || [];
        const alreadyCorrect =
            emailsList.length === existing.length &&
            emailsList.every(e => existing.includes(e));

        if (alreadyCorrect) {
            skipped++;
            continue;
        }

        updates.push({ ref: document.ref, data: { emailsList } });
        console.log(`✅ ${document.id}: emailsList=[${emailsList.join(", ")}]`);
    }

    if (updates.length === 0) {
        console.log(`\nAll student requests already have emailsList. (skipped ${skipped})`);
        return;
    }

    console.log(`\nAbout to update ${updates.length} student requests (skipped ${skipped}).\n`);
    await commitBatchSafely(db, updates);
    console.log(`\n🎉 studentEventRequests emailsList migration complete! Updated ${updates.length} docs.`);
}

async function runAllMigrations() {
    await migrateShiftsEmailsList();
    await migrateStudentRequestsEmailsList();
}

runAllMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("❌ Error:", err?.message || err);
        process.exit(1);
    });
