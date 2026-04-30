'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore'

/**
 * Global cache to ensure services are initialized only once on the client,
 * even with Next.js HMR.
 */
let cachedApp: FirebaseApp | undefined;
let cachedAuth: Auth | undefined;
let cachedFirestore: Firestore | undefined;

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (typeof window === 'undefined') {
    // Basic initialization for SSR if needed, though we primarily use client-side
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    return getSdks(app);
  }

  if (!cachedApp) {
    if (!getApps().length) {
      try {
        // Attempt to initialize via Firebase App Hosting environment variables
        cachedApp = initializeApp();
      } catch (e) {
        cachedApp = initializeApp(firebaseConfig);
      }
    } else {
      cachedApp = getApp();
    }
  }

  if (!cachedAuth && cachedApp) {
    cachedAuth = getAuth(cachedApp);
  }
  
  if (!cachedFirestore && cachedApp) {
    cachedFirestore = getFirestore(cachedApp);
  }

  return {
    firebaseApp: cachedApp!,
    auth: cachedAuth!,
    firestore: cachedFirestore!
  };
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';