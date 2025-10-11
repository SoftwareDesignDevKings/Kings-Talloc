/**
 * Firebase Security Rules Tests - Tutor Availabilities Collection
 *
 * Tests tutorAvailabilities collection access control
 * This tests the actual firestore.rules file against the Firebase emulator
 *
 * Run with: firebase emulators:exec --only firestore "npm test -- __tests__/firebase.tutorAvailabilities.test.js"
 *
 * @jest-environment node
 */

const { initializeTestEnvironment } = require("@firebase/rules-unit-testing");

// assertFails and assertSucceeds are provided by firebaseTestSetup.js
// to properly suppress console warnings only during expected failures
const { assertFails, assertSucceeds } = global;
const fs = require("fs");
const path = require("path");

let testEnv;

beforeAll(async () => {
    // Read the actual firestore.rules file
    const rulesPath = path.join(__dirname, "../firebase", "firestore.rules");
    const rules = fs.readFileSync(rulesPath, "utf8");

    // Initialize test environment with the actual rules
    testEnv = await initializeTestEnvironment({
        projectId: "test-project-tutor-availabilities",
        firestore: {
            rules,
            host: "localhost",
            port: 8080,
        },
    });
});

afterAll(async () => {
    await testEnv.cleanup();
});

beforeEach(async () => {
    await testEnv.clearFirestore();
});

describe("Firebase Security Rules - Tutor Availabilities Collection", () => {
    const teacherEmail = "teacher@kings.edu.au";
    const tutorEmail = "tutor@kings.edu.au";
    const otherTutorEmail = "othertutor@kings.edu.au";
    const studentEmail = "student@student.kings.edu.au";
    const tutorSub = "tutor-uid-123";
    const otherTutorSub = "other-tutor-uid-456";

    describe("Tutor Availabilities - Read Access", () => {
        test("authenticated users CAN read tutor availabilities", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: "student",
            });
            const db = context.firestore();

            await assertSucceeds(db.collection("tutorAvailabilities").get());
        });

        test("unauthenticated users CANNOT read tutor availabilities", async () => {
            const context = testEnv.unauthenticatedContext();
            const db = context.firestore();

            await assertFails(db.collection("tutorAvailabilities").get());
        });
    });

    describe("Tutor Availabilities - Create Access", () => {
        test("tutor CAN create their own availability", async () => {
            const context = testEnv.authenticatedContext(tutorSub, {
                email: tutorEmail,
                role: "tutor",
            });
            const db = context.firestore();

            const availabilityData = {
                tutor: tutorSub,
                start: new Date("2025-10-15T09:00:00"),
                end: new Date("2025-10-15T10:00:00"),
                recurring: false,
                dayOfWeek: null,
            };

            await assertSucceeds(
                db.collection("tutorAvailabilities").add(availabilityData),
            );
        });

        test("tutor CANNOT create availability for another tutor", async () => {
            const context = testEnv.authenticatedContext(tutorSub, {
                email: tutorEmail,
                role: "tutor",
            });
            const db = context.firestore();

            const availabilityData = {
                tutor: otherTutorSub,
                start: new Date("2025-10-15T09:00:00"),
                end: new Date("2025-10-15T10:00:00"),
                recurring: false,
            };

            await assertFails(
                db.collection("tutorAvailabilities").add(availabilityData),
            );
        });

        test("teacher CANNOT create tutor availabilities", async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                role: "teacher",
            });
            const db = context.firestore();

            const availabilityData = {
                tutor: tutorSub,
                start: new Date("2025-10-15T09:00:00"),
                end: new Date("2025-10-15T10:00:00"),
                recurring: false,
            };

            await assertFails(
                db.collection("tutorAvailabilities").add(availabilityData),
            );
        });

        test("student CANNOT create tutor availabilities", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: "student",
            });
            const db = context.firestore();

            const availabilityData = {
                tutor: tutorSub,
                start: new Date("2025-10-15T09:00:00"),
                end: new Date("2025-10-15T10:00:00"),
                recurring: false,
            };

            await assertFails(
                db.collection("tutorAvailabilities").add(availabilityData),
            );
        });
    });

    describe("Tutor Availabilities - Update Access", () => {
        let availabilityId;

        beforeEach(async () => {
            // Create an availability for testing
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();
                const ref = await db.collection("tutorAvailabilities").add({
                    tutor: tutorSub,
                    start: new Date("2025-10-15T09:00:00"),
                    end: new Date("2025-10-15T10:00:00"),
                    recurring: false,
                    dayOfWeek: null,
                });
                availabilityId = ref.id;
            });
        });

        test("tutor CAN update their own availability", async () => {
            const context = testEnv.authenticatedContext(tutorSub, {
                email: tutorEmail,
                role: "tutor",
            });
            const db = context.firestore();

            await assertSucceeds(
                db
                    .collection("tutorAvailabilities")
                    .doc(availabilityId)
                    .update({
                        start: new Date("2025-10-15T10:00:00"),
                        end: new Date("2025-10-15T11:00:00"),
                    }),
            );
        });

        test("tutor CANNOT update another tutor's availability", async () => {
            const context = testEnv.authenticatedContext(otherTutorSub, {
                email: otherTutorEmail,
                role: "tutor",
            });
            const db = context.firestore();

            await assertFails(
                db
                    .collection("tutorAvailabilities")
                    .doc(availabilityId)
                    .update({
                        start: new Date("2025-10-15T10:00:00"),
                    }),
            );
        });

        test("teacher CANNOT update tutor availabilities", async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                role: "teacher",
            });
            const db = context.firestore();

            await assertFails(
                db
                    .collection("tutorAvailabilities")
                    .doc(availabilityId)
                    .update({
                        start: new Date("2025-10-15T10:00:00"),
                    }),
            );
        });

        test("student CANNOT update tutor availabilities", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: "student",
            });
            const db = context.firestore();

            await assertFails(
                db
                    .collection("tutorAvailabilities")
                    .doc(availabilityId)
                    .update({
                        start: new Date("2025-10-15T10:00:00"),
                    }),
            );
        });
    });

    describe("Tutor Availabilities - Delete Access", () => {
        let availabilityId;

        beforeEach(async () => {
            // Create an availability for testing
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();
                const ref = await db.collection("tutorAvailabilities").add({
                    tutor: tutorSub,
                    start: new Date("2025-10-15T09:00:00"),
                    end: new Date("2025-10-15T10:00:00"),
                    recurring: false,
                });
                availabilityId = ref.id;
            });
        });

        test("tutor CAN delete their own availability", async () => {
            const context = testEnv.authenticatedContext(tutorSub, {
                email: tutorEmail,
                role: "tutor",
            });
            const db = context.firestore();

            await assertSucceeds(
                db
                    .collection("tutorAvailabilities")
                    .doc(availabilityId)
                    .delete(),
            );
        });

        test("tutor CANNOT delete another tutor's availability", async () => {
            const context = testEnv.authenticatedContext(otherTutorSub, {
                email: otherTutorEmail,
                role: "tutor",
            });
            const db = context.firestore();

            await assertFails(
                db
                    .collection("tutorAvailabilities")
                    .doc(availabilityId)
                    .delete(),
            );
        });

        test("teacher CANNOT delete tutor availabilities", async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                role: "teacher",
            });
            const db = context.firestore();

            await assertFails(
                db
                    .collection("tutorAvailabilities")
                    .doc(availabilityId)
                    .delete(),
            );
        });

        test("student CANNOT delete tutor availabilities", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: "student",
            });
            const db = context.firestore();

            await assertFails(
                db
                    .collection("tutorAvailabilities")
                    .doc(availabilityId)
                    .delete(),
            );
        });
    });
});
