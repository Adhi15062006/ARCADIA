import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  setPersistence, 
  browserLocalPersistence,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import { getFirestore, setLogLevel } from "firebase/firestore";

setLogLevel("error");

const firebaseConfig = (window as any).FIREBASE_CONFIG || {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || import.meta.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const dbId = (window as any).FIREBASE_CONFIG?.firestoreDatabaseId || import.meta.env.VITE_FIREBASE_DATABASE_ID || import.meta.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || undefined;

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.log("[Firebase Auth] Persistence initialization deferred:", err.message || err);
});
export const db = getFirestore(app, dbId);

export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

// Trigger Google Sign-In Popup
export const logInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Sign-in failed:", error);
  }
};

// Listen for Auth State Changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Authenticated User UID:", user.uid);
    // Update your application UI state here
  } else {
    console.log("User is signed out");
  }
});

// Sign Out
export const logOut = () => signOut(auth);

// --- CUSTOM FIRESTORE ERROR HANDLING STRUCTURES ---

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

