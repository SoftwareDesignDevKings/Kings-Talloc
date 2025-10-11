/**
 * Firebase Security Rules Tests - Events Collection
 *
 * Tests events collection access control focusing on the new tutor workStatus update permission
 * This tests the actual firestore.rules file against the Firebase emulator
 *
 * Run with: firebase emulators:exec --only firestore "npm test -- __tests__/firebaseRules.events.test.js"
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
        projectId: "test-project-events",
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

describe("Firebase Security Rules - Events Collection", () => {
    const teacherEmail = "teacher@kings.edu.au";
    const tutorEmail = "tutor@kings.edu.au";
    const studentEmail = "student@student.kings.edu.au";

    describe("Events - Read Access", () => {
        test("authenticated users CAN read events", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: "student",
            });
            const db = context.firestore();

            await assertSucceeds(db.collection("events").get());
        });

        test("unauthenticated users CANNOT read events", async () => {
            const context = testEnv.unauthenticatedContext();
            const db = context.firestore();

            await assertFails(db.collection("events").get());
        });
    });

    describe("Events - Create Access", () => {
        test("teacher CAN create events", async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                role: "teacher",
            });
            const db = context.firestore();

            const eventData = {
                title: "Test Event",
                start: new Date("2025-10-15T09:00:00"),
                end: new Date("2025-10-15T10:00:00"),
                staff: [{ value: tutorEmail, label: "Tutor" }],
                students: [],
                classes: [],
                workStatus: "notCompleted",
                workType: "tutoring",
                approvalStatus: "approved",
                description: "",
                confirmationRequired: false,
                tutorResponses: [],
                studentResponses: [],
                minStudents: 0,
                createdByStudent: false,
                locationType: "onsite",
            };

            await assertSucceeds(db.collection("events").add(eventData));
        });

        test("tutor CANNOT create events", async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                role: "tutor",
            });
            const db = context.firestore();

            const eventData = {
                title: "Test Event",
                start: new Date("2025-10-15T09:00:00"),
                end: new Date("2025-10-15T10:00:00"),
                staff: [{ value: tutorEmail, label: "Tutor" }],
                students: [],
                workStatus: "notCompleted",
            };

            await assertFails(db.collection("events").add(eventData));
        });

        test("student CANNOT create events", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: "student",
            });
            const db = context.firestore();

            const eventData = {
                title: "Test Event",
                start: new Date("2025-10-15T09:00:00"),
                end: new Date("2025-10-15T10:00:00"),
                students: [{ value: studentEmail, label: "Student" }],
            };

            await assertFails(db.collection("events").add(eventData));
        });
    });

    describe("Events - Update Access", () => {
        let eventId;

        beforeEach(async () => {
            // Create an event for testing
            //
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();
                const ref = await db.collection("events").add({
                    title: "Test Event",
                    start: new Date("2025-10-15T09:00:00"),
                    end: new Date("2025-10-15T10:00:00"),
                    staff: [{ value: tutorEmail, label: "Tutor" }],
                    students: [],
                    classes: [],
                    workStatus: "notCompleted",
                    workType: "tutoring",
                    approvalStatus: "approved",
                    description: "Test description",
                });
                eventId = ref.id;
            });
        });

        test("teacher CAN update any field in events", async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                role: "teacher",
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection("events").doc(eventId).update({
                    title: "Updated Title",
                    description: "Updated description",
                    workStatus: "completed",
                }),
            );
        });

        test("tutor CAN update only workStatus field", async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                role: "tutor",
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection("events").doc(eventId).update({
                    workStatus: "completed",
                }),
            );
        });

        test("tutor CAN update workStatus to different values", async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                role: "tutor",
            });
            const db = context.firestore();

            // Test updating to 'completed'
            await assertSucceeds(
                db.collection("events").doc(eventId).update({
                    workStatus: "completed",
                }),
            );

            // Test updating to 'notAttended'
            await assertSucceeds(
                db.collection("events").doc(eventId).update({
                    workStatus: "notAttended",
                }),
            );
        });

        test("tutor CANNOT update workStatus AND other fields", async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                role: "tutor",
            });
            const db = context.firestore();

            await assertFails(
                db.collection("events").doc(eventId).update({
                    workStatus: "completed",
                    title: "Hacked title",
                }),
            );
        });

        test("tutor CANNOT update title field", async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                role: "tutor",
            });
            const db = context.firestore();

            await assertFails(
                db.collection("events").doc(eventId).update({
                    title: "Updated Title",
                }),
            );
        });

        test("tutor CANNOT update description field", async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                role: "tutor",
            });
            const db = context.firestore();

            await assertFails(
                db.collection("events").doc(eventId).update({
                    description: "Updated description",
                }),
            );
        });

        test("tutor CANNOT update staff field", async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                role: "tutor",
            });
            const db = context.firestore();

            await assertFails(
                db
                    .collection("events")
                    .doc(eventId)
                    .update({
                        staff: [
                            { value: "other@kings.edu.au", label: "Other" },
                        ],
                    }),
            );
        });

        test("student CANNOT update events", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: "student",
            });
            const db = context.firestore();

            await assertFails(
                db.collection("events").doc(eventId).update({
                    title: "Updated by student",
                }),
            );
        });

        test("student CANNOT update workStatus", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: "student",
            });
            const db = context.firestore();

            await assertFails(
                db.collection("events").doc(eventId).update({
                    workStatus: "completed",
                }),
            );
        });
    });

    describe("Events - Delete Access", () => {
        let eventId;

        beforeEach(async () => {
            // Create an event for testing
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();
                const ref = await db.collection("events").add({
                    title: "Test Event",
                    start: new Date("2025-10-15T09:00:00"),
                    end: new Date("2025-10-15T10:00:00"),
                    staff: [{ value: tutorEmail, label: "Tutor" }],
                    students: [],
                    workStatus: "notCompleted",
                });
                eventId = ref.id;
            });
        });

        test("teacher CAN delete events", async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                role: "teacher",
            });
            const db = context.firestore();

            await assertSucceeds(db.collection("events").doc(eventId).delete());
        });

        test("tutor CANNOT delete events", async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                role: "tutor",
            });
            const db = context.firestore();

            await assertFails(db.collection("events").doc(eventId).delete());
        });

        test("student CANNOT delete events", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: "student",
            });
            const db = context.firestore();

            await assertFails(db.collection("events").doc(eventId).delete());
        });
    });
});
