import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, OAuthProvider, RecaptchaVerifier, signInWithPopup, signInWithPhoneNumber } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Use environment variables for Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// ✅ Initialize Firebase app
const app = initializeApp(firebaseConfig);

// ✅ Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// ✅ Add Authentication Providers
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");

// ✅ Add RecaptchaVerifier and Phone Sign-in functions
export const recaptchaVerifier = (containerId: string) => 
  new RecaptchaVerifier(auth, containerId, { size: "invisible" });

export const phoneSignIn = async (phoneNumber: string, verifier: RecaptchaVerifier) => {
  try {
    const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    return confirmation;
  } catch (error) {
    console.error("Phone sign-in error:", error);
    throw error;
  }
};