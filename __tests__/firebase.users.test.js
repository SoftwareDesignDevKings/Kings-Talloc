/**
 * Firebase Security Rules Tests - Users Collection
 *
 * Tests users collection access control focusing on role management permissions
 * This tests the actual firestore.rules file against the Firebase emulator
 *
 * Run with: firebase emulators:exec --only firestore "npm test -- __tests__/firebase.users.test.js"
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
        projectId: "test-project-users",
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

describe("Firebase Security Rules - Users Collection", () => {
    const teacherEmail = "teacher@kings.edu.au";
    const tutorEmail = "tutor@kings.edu.au";
    const studentEmail = "student@student.kings.edu.au";
    const otherStudentEmail = "otherstudent@student.kings.edu.au";

    describe("Users - Read Access", () => {
        test("authenticated users CAN read users", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: "student",
            });
            const db = context.firestore();

            await assertSucceeds(db.collection("users").get());
        });

        test("unauthenticated users CANNOT read users", async () => {
            const context = testEnv.unauthenticatedContext();
            const db = context.firestore();

            await assertFails(db.collection("users").get());
        });
    });

    describe("Users - Create Access", () => {
        test("user CAN create their own user document", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: "student",
            });
            const db = context.firestore();

            const userData = {
                email: studentEmail,
                name: "Test Student",
                role: "student",
                createdAt: new Date(),
            };

            await assertSucceeds(
                db.collection("users").doc(studentEmail).set(userData),
            );
        });

        test("user CANNOT create user document for another user", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: "student",
            });
            const db = context.firestore();

            const userData = {
                email: otherStudentEmail,
                name: "Other Student",
                role: "student",
            };

            await assertFails(
                db.collection("users").doc(otherStudentEmail).set(userData),
            );
        });

        test("unauthenticated users CANNOT create user documents", async () => {
            const context = testEnv.unauthenticatedContext();
            const db = context.firestore();

            const userData = {
                email: studentEmail,
                name: "Test Student",
                role: "student",
            };

            await assertFails(
                db.collection("users").doc(studentEmail).set(userData),
            );
        });
    });

    describe("Users - Update Access", () => {
        beforeEach(async () => {
            // Create user documents for testing
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();
                await db
                    .collection("users")
                    .doc(studentEmail)
                    .set({
                        email: studentEmail,
                        name: "Test Student",
                        role: "student",
                        preferences: { theme: "light" },
                    });
                await db.collection("users").doc(tutorEmail).set({
                    email: tutorEmail,
                    name: "Test Tutor",
                    role: "tutor",
                });
            });
        });

        test("teacher CAN update any user", async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                role: "teacher",
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection("users").doc(studentEmail).update({
                    name: "Updated Student Name",
                }),
            );
        });

        test("teacher CAN update user roles", async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                role: "teacher",
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection("users").doc(studentEmail).update({
                    role: "tutor",
                }),
            );
        });

        test("user CAN update their own user document (non-role fields)", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: "student",
            });
            const db = context.firestore();

            await assertSucceeds(
                db
                    .collection("users")
                    .doc(studentEmail)
                    .update({
                        name: "Updated Name",
                        preferences: { theme: "dark" },
                    }),
            );
        });

        test("user CANNOT update their own role", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: "student",
            });
            const db = context.firestore();

            await assertFails(
                db.collection("users").doc(studentEmail).update({
                    role: "teacher",
                }),
            );
        });

        test("user CANNOT update their own role even with other fields", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: "student",
            });
            const db = context.firestore();

            await assertFails(
                db.collection("users").doc(studentEmail).update({
                    name: "Updated Name",
                    role: "teacher",
                }),
            );
        });

        test("user CANNOT update another user's document", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: "student",
            });
            const db = context.firestore();

            await assertFails(
                db.collection("users").doc(tutorEmail).update({
                    name: "Hacked Name",
                }),
            );
        });

        test("tutor CANNOT update student roles", async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                role: "tutor",
            });
            const db = context.firestore();

            await assertFails(
                db.collection("users").doc(studentEmail).update({
                    role: "teacher",
                }),
            );
        });
    });

    describe("Users - Delete Access", () => {
        beforeEach(async () => {
            // Create user documents for testing
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();
                await db.collection("users").doc(studentEmail).set({
                    email: studentEmail,
                    name: "Test Student",
                    role: "student",
                });
            });
        });

        test("teacher CAN delete users", async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                role: "teacher",
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection("users").doc(studentEmail).delete(),
            );
        });

        test("tutor CANNOT delete users", async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                role: "tutor",
            });
            const db = context.firestore();

            await assertFails(
                db.collection("users").doc(studentEmail).delete(),
            );
        });

        test("student CANNOT delete their own user document", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: "student",
            });
            const db = context.firestore();

            await assertFails(
                db.collection("users").doc(studentEmail).delete(),
            );
        });

        test("student CANNOT delete other users", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: "student",
            });
            const db = context.firestore();

            await assertFails(db.collection("users").doc(tutorEmail).delete());
        });
    });
});
