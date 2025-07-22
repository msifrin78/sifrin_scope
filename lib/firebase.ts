
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseInitializationError: Error | null = null;

try {
  const isFirebaseConfigValid = 
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId;

  if (!isFirebaseConfigValid) {
    throw new Error("Firebase configuration is missing or incomplete. Please ensure your Firebase environment variables (NEXT_PUBLIC_FIREBASE_*) are correctly set in your project settings and then restart the application.");
  }

  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("Firebase initialized successfully. Project ID:", firebaseConfig.projectId);

} catch (e: any) {
  console.error("Firebase initialization failed:", e);
  firebaseInitializationError = e;
  // Set to null so other parts of the app can check for initialization status
  app = null;
  auth = null;
  db = null;
}

export { app, auth, db, firebaseInitializationError };
