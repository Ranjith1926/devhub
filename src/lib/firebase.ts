/**
 * firebase.ts — Firebase app initialisation.
 *
 * Replace the placeholder values below with your own project's config.
 * Firebase Console → Project Settings → Your apps → SDK setup and configuration.
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCi4vyNPixWiqlFq4nvYkMf3Vrhy0TtY8Y',
  authDomain: 'devhub-9a1a1.firebaseapp.com',
  projectId: 'devhub-9a1a1',
  storageBucket: 'devhub-9a1a1.firebasestorage.app',
  messagingSenderId: '11368217691',
  appId: '1:11368217691:web:9f1ca5a7cf4872f560137e',
  measurementId: 'G-WYE630MR0E',
};

const app = initializeApp(firebaseConfig);

/** Firebase Auth instance — import this wherever auth is needed. */
export const auth = getAuth(app);

/** Firestore instance. */
export const db = getFirestore(app);
