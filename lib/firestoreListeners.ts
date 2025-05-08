// /lib/firestoreListeners.ts

// This utility keeps track of all active Firestore subscriptions
// so they can be properly detached when needed

import { Unsubscribe } from "firebase/firestore";

// Store all active subscription references
const activeListeners: Unsubscribe[] = [];

/**
 * Register a Firestore listener so it can be detached later
 * @param unsubscribe The unsubscribe function returned by onSnapshot
 */
export function registerFirestoreListener(unsubscribe: Unsubscribe): void {
  activeListeners.push(unsubscribe);
}

/**
 * Detach a specific Firestore listener
 * @param unsubscribe The unsubscribe function to remove
 */
export function detachFirestoreListener(unsubscribe: Unsubscribe): void {
  const index = activeListeners.indexOf(unsubscribe);
  if (index > -1) {
    // Call the unsubscribe function to detach the listener
    unsubscribe();
    // Remove from our tracking array
    activeListeners.splice(index, 1);
  }
}

/**
 * Detach all active Firestore listeners
 * Should be called before logging out or when navigating away from pages
 */
export function detachAllFirestoreListeners(): void {
  activeListeners.forEach(unsubscribe => {
    try {
      unsubscribe();
    } catch (error) {
      console.error("Error detaching Firestore listener:", error);
    }
  });
  
  // Clear the array
  activeListeners.length = 0;
}