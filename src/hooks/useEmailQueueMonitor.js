import { useEffect, useRef } from 'react';
import { db } from '@/firestore/clientFirestore';
import { collection, onSnapshot } from 'firebase/firestore';
import { nextSendQueuedEmails } from '@client/nextAPI';

/**
 * Hook to monitor emailEventsQueue and trigger email sending every 5 minutes if there are changes
 * Only works for teachers (security)
 * @param {string} userRole - The current user's role
 */
export const useEmailQueueMonitor = (userRole) => {
  const lastQueueSizeRef = useRef(0);
  const previousQueueSizeRef = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Only teachers can trigger email sending
    if (userRole !== 'teacher') {
      return;
    }

    // Listen to emailEventsQueue changes
    const unsubscribe = onSnapshot(
      collection(db, 'emailEventsQueue'),
      (snapshot) => {
        lastQueueSizeRef.current = snapshot.size;
      },
      (error) => {
        console.error('Error monitoring email queue:', error);
      }
    );

    // Set up 5-minute interval to check and send emails
    intervalRef.current = setInterval(async () => {
      const currentSize = lastQueueSizeRef.current;
      const previousSize = previousQueueSizeRef.current;

      // Only trigger if queue size has changed AND is greater than 0
      if (currentSize > 0 && currentSize !== previousSize) {
        console.log(`[Email Monitor] Queue size changed (${previousSize} → ${currentSize}), triggering email send...`);

        try {
          const response = await nextSendQueuedEmails();
          const data = await response.json();
          console.log('[Email Monitor]', data.message);

          // Update previous size after successful send
          previousQueueSizeRef.current = 0; // Reset since queue should be empty after send
        } catch (error) {
          console.error('[Email Monitor] Failed to send emails:', error);
        }
      } else if (currentSize === 0 && previousSize !== 0) {
        console.log('[Email Monitor] Queue cleared');
        previousQueueSizeRef.current = 0;
      } else {
        console.log(`[Email Monitor] No changes detected (size: ${currentSize})`);
      }
    }, 1 * 60 * 5000);

    // Cleanup
    return () => {
      if (unsubscribe) unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log('[Email Monitor] Stopped');
      }
    };
  }, [userRole]);
};
