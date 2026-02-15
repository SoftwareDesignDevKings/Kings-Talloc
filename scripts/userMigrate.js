/**
 * Migration script:
 *
 * USERS collection:
 *   - Copies: role -> defaultRole
 *   - Ensures: userRoles is an array (defaults to [])
 *   - Does NOT remove role (so prod won't break)
 *
 * SHIFTS collection:
 *   - Ensures: recurring field exists (sets to null if missing)
 *   - Ensures: until field exists (sets to null if missing)
 *   - Ensures: isRecurringInstance field exists (sets to false if missing)
 *   - Ensures: recurringEventId field exists (sets to null if missing)
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

async function migrateUsers() {
    console.log("Starting user migration...\n");

    const serviceAccount = getServiceAccountFromEnv();

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }

    const db = admin.firestore();

    const snap = await db.collection("users").get();

    if (snap.empty) {
        console.log("No users found.");
        return;
    }

    console.log(`Found ${snap.size} users.\n`);

    const updates = [];
    let skipped = 0;

    for (const doc of snap.docs) {
        const data = doc.data() || {};

        const desiredDefault = data.role ?? null;
        const defaultAlreadyCorrect =
            Object.prototype.hasOwnProperty.call(data, "defaultRole") &&
            data.defaultRole === desiredDefault;

        const userRolesIsArray = Array.isArray(data.userRoles);

        // Skip only if everything is already in the desired shape
        if (defaultAlreadyCorrect && userRolesIsArray) {
            skipped++;
            continue;
        }

        const patch = {
            defaultRole: desiredDefault, // <- IMPORTANT: comes from .role
        };

        if (!userRolesIsArray) {
            patch.userRoles = [];
        }

        updates.push({ ref: doc.ref, data: patch });

        console.log(
            `✅ ${doc.id}: defaultRole=${JSON.stringify(desiredDefault)}` +
            `${!userRolesIsArray ? " userRoles=[]" : ""}`
        );
    }

    if (updates.length === 0) {
        console.log(`\nAll users already migrated. (skipped ${skipped})`);
        return;
    }

    console.log(`\nAbout to update ${updates.length} users (skipped ${skipped}).\n`);
    await commitBatchSafely(db, updates);

    console.log(`\n🎉 User migration complete! Updated ${updates.length} users.`);
}

async function migrateShifts() {
    console.log("\n\nStarting shifts migration...\n");

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

    const updates = [];
    let skipped = 0;

    for (const doc of snap.docs) {
        const data = doc.data() || {};

        const hasRecurring = Object.prototype.hasOwnProperty.call(data, "recurring");
        const hasUntil = Object.prototype.hasOwnProperty.call(data, "until");
        const hasIsRecurringInstance = Object.prototype.hasOwnProperty.call(data, "isRecurringInstance");
        const hasRecurringEventId = Object.prototype.hasOwnProperty.call(data, "recurringEventId");

        // Skip if all fields already exist
        if (hasRecurring && hasUntil && hasIsRecurringInstance && hasRecurringEventId) {
            skipped++;
            continue;
        }

        const patch = {};

        if (!hasRecurring) {
            patch.recurring = null;
        }
        if (!hasUntil) {
            patch.until = null;
        }
        if (!hasIsRecurringInstance) {
            patch.isRecurringInstance = false;
        }
        if (!hasRecurringEventId) {
            patch.recurringEventId = null;
        }

        updates.push({ ref: doc.ref, data: patch });

        const fields = Object.keys(patch).join(", ");
        console.log(`✅ ${doc.id}: Added missing fields: ${fields}`);
    }

    if (updates.length === 0) {
        console.log(`\nAll shifts already migrated. (skipped ${skipped})`);
        return;
    }

    console.log(`\nAbout to update ${updates.length} shifts (skipped ${skipped}).\n`);
    await commitBatchSafely(db, updates);

    console.log(`\n🎉 Shifts migration complete! Updated ${updates.length} shifts.`);
}

async function runAllMigrations() {
    await migrateUsers();
    await migrateShifts();
}

runAllMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("❌ Error:", err?.message || err);
        process.exit(1);
    });
