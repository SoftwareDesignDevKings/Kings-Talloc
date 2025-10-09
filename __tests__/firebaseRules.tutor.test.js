/**
 * Firebase Security Rules Tests - Tutor Role
 *
 * Tests tutor-specific access control using @firebase/rules-unit-testing
 * This tests the actual firestore.rules file against the Firebase emulator
 *
 * Run with: firebase emulators:exec --only firestore "npm test -- __tests__/firebaseRules.tutor.test.js"
 *
 * @jest-environment node
 */

const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

let testEnv;

beforeAll(async () => {
  // Read the actual firestore.rules file
  const rulesPath = path.join(__dirname, '../firebase', 'firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  // Initialize test environment with the actual rules
  testEnv = await initializeTestEnvironment({
    projectId: 'test-project-tutor',
    firestore: {
      rules,
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  // Clean up test environment
  await testEnv.cleanup();
});

beforeEach(async () => {
  // Clear data between tests
  await testEnv.clearFirestore();
});

describe('Firebase Security Rules - Tutor Role', () => {
  const tutorEmail = 'tutor@kings.edu.au';
  const otherTutorEmail = 'othertutor@kings.edu.au';

  beforeEach(async () => {
    // Set up user roles in Firestore
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();

      // Create user documents with roles
      await db.collection('users').doc(tutorEmail).set({ role: 'tutor' });
      await db.collection('users').doc(otherTutorEmail).set({ role: 'tutor' });
      await db.collection('users').doc('teacher@kings.edu.au').set({ role: 'teacher' });
      await db.collection('users').doc('student@kings.edu.au').set({ role: 'student' });
    });
  });

  describe('Tutor Availabilities Access Control', () => {

    test('tutor CAN read all availabilities', async () => {
      const context = testEnv.authenticatedContext(tutorEmail, { email: tutorEmail });
      const db = context.firestore();

      await assertSucceeds(
        db.collection('tutorAvailabilities').get()
      );
    });

    test('tutor CAN create their own availability', async () => {
      const context = testEnv.authenticatedContext(tutorEmail, { email: tutorEmail });
      const db = context.firestore();

      const availabilityData = {
        title: 'Availability',
        tutor: tutorEmail,
        start: new Date('2025-10-08T09:00:00'),
        end: new Date('2025-10-08T10:00:00'),
        workType: 'tutoringOrWork',
        locationType: 'onsite'
      };

      await assertSucceeds(
        db.collection('tutorAvailabilities').add(availabilityData)
      );
    });

    test('tutor CANNOT create availability for another tutor', async () => {
      const context = testEnv.authenticatedContext(tutorEmail, { email: tutorEmail });
      const db = context.firestore();

      const availabilityData = {
        title: 'Availability',
        tutor: otherTutorEmail, // Different tutor
        start: new Date('2025-10-08T09:00:00'),
        end: new Date('2025-10-08T10:00:00'),
        workType: 'tutoringOrWork',
        locationType: 'onsite'
      };

      await assertFails(
        db.collection('tutorAvailabilities').add(availabilityData)
      );
    });

    test('tutor CAN update their own availability', async () => {
      // First create an availability as the tutor
      let availabilityId;
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        const ref = await db.collection('tutorAvailabilities').add({
          title: 'Availability',
          tutor: tutorEmail,
          start: new Date('2025-10-08T09:00:00'),
          end: new Date('2025-10-08T10:00:00'),
        });
        availabilityId = ref.id;
      });

      // Now try to update it as the tutor
      const context = testEnv.authenticatedContext(tutorEmail, { email: tutorEmail });
      const db = context.firestore();

      await assertSucceeds(
        db.collection('tutorAvailabilities').doc(availabilityId).update({
          title: 'Updated Availability'
        })
      );
    });

    test('tutor CANNOT update another tutor\'s availability', async () => {
      // Create an availability for another tutor
      let availabilityId;
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        const ref = await db.collection('tutorAvailabilities').add({
          title: 'Availability',
          tutor: otherTutorEmail, // Different tutor
          start: new Date('2025-10-08T09:00:00'),
          end: new Date('2025-10-08T10:00:00'),
        });
        availabilityId = ref.id;
      });

      // Try to update it as the first tutor
      const context = testEnv.authenticatedContext(tutorEmail, { email: tutorEmail });
      const db = context.firestore();

      await assertFails(
        db.collection('tutorAvailabilities').doc(availabilityId).update({
          title: 'Updated Availability'
        })
      );
    });

    test('tutor CAN delete their own availability', async () => {
      // Create an availability as the tutor
      let availabilityId;
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        const ref = await db.collection('tutorAvailabilities').add({
          title: 'Availability',
          tutor: tutorEmail,
          start: new Date('2025-10-08T09:00:00'),
          end: new Date('2025-10-08T10:00:00'),
        });
        availabilityId = ref.id;
      });

      // Try to delete it as the tutor
      const context = testEnv.authenticatedContext(tutorEmail, { email: tutorEmail });
      const db = context.firestore();

      await assertSucceeds(
        db.collection('tutorAvailabilities').doc(availabilityId).delete()
      );
    });

    test('tutor CANNOT delete another tutor\'s availability', async () => {
      // Create an availability for another tutor
      let availabilityId;
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        const ref = await db.collection('tutorAvailabilities').add({
          title: 'Availability',
          tutor: otherTutorEmail, // Different tutor
          start: new Date('2025-10-08T09:00:00'),
          end: new Date('2025-10-08T10:00:00'),
        });
        availabilityId = ref.id;
      });

      // Try to delete it as the first tutor
      const context = testEnv.authenticatedContext(tutorEmail, { email: tutorEmail });
      const db = context.firestore();

      await assertFails(
        db.collection('tutorAvailabilities').doc(availabilityId).delete()
      );
    });
  });

  describe('Events Access Control (Tutor Restrictions)', () => {

    test('tutor CAN read events', async () => {
      const context = testEnv.authenticatedContext(tutorEmail, { email: tutorEmail });
      const db = context.firestore();

      await assertSucceeds(
        db.collection('events').get()
      );
    });

    test('tutor CANNOT create events', async () => {
      const context = testEnv.authenticatedContext(tutorEmail, { email: tutorEmail });
      const db = context.firestore();

      const eventData = {
        title: 'Test Event',
        start: new Date('2025-10-08T09:00:00'),
        end: new Date('2025-10-08T10:00:00'),
        staff: [{ value: tutorEmail, label: 'Tutor' }],
        students: [],
        workStatus: 'notCompleted',
        approvalStatus: 'approved'
      };

      await assertFails(
        db.collection('events').add(eventData)
      );
    });

    test('tutor CANNOT update events', async () => {
      // Create an event as teacher
      let eventId;
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        const ref = await db.collection('events').add({
          title: 'Test Event',
          start: new Date('2025-10-08T09:00:00'),
          end: new Date('2025-10-08T10:00:00'),
          staff: [{ value: tutorEmail, label: 'Tutor' }],
          students: [],
        });
        eventId = ref.id;
      });

      // Try to update as tutor
      const context = testEnv.authenticatedContext(tutorEmail, { email: tutorEmail });
      const db = context.firestore();

      await assertFails(
        db.collection('events').doc(eventId).update({
          title: 'Updated Event'
        })
      );
    });

    test('tutor CANNOT delete events', async () => {
      // Create an event as teacher
      let eventId;
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        const ref = await db.collection('events').add({
          title: 'Test Event',
          start: new Date('2025-10-08T09:00:00'),
          end: new Date('2025-10-08T10:00:00'),
          staff: [{ value: tutorEmail, label: 'Tutor' }],
          students: [],
        });
        eventId = ref.id;
      });

      // Try to delete as tutor
      const context = testEnv.authenticatedContext(tutorEmail, { email: tutorEmail });
      const db = context.firestore();

      await assertFails(
        db.collection('events').doc(eventId).delete()
      );
    });
  });
});
