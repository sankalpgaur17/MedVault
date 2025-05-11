"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  OAuthProvider,
  RecaptchaVerifier,
  signInWithPopup,
  signInWithPhoneNumber,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore";

declare global {
  interface Window {
    recaptchaVerifier: any;
    confirmationResult: any;
  }
}

const SignUpPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const initializeRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
      });
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName || "Google User",
        email: user.email,
        photoURL: user.photoURL || "",
        createdAt: serverTimestamp(),
      });

      router.push("/profile"); // New user gets directed to profile page
    } catch (err: any) {
      if (err.code !== "auth/cancelled-popup-request") {
        console.error("Google sign-in error:", err);
        setError(err.message);
      }
    }
  };

  const handleAppleSignIn = async () => {
    const provider = new OAuthProvider("apple.com");
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName || "Apple User",
        email: user.email,
        photoURL: user.photoURL || "",
        createdAt: serverTimestamp(),
      });

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Apple sign-in error:", err);
      setError(err.message);
    }
  };

  const handlePhoneSignIn = async () => {
    if (!phone) return setError("Enter a valid phone number.");
    try {
      initializeRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      window.confirmationResult = confirmation;

      const code = prompt("Enter OTP sent to your phone:");
      if (code) {
        const result = await confirmation.confirm(code);
        const user = result.user;

        await setDoc(doc(db, "users", user.uid), {
          name: "Phone User",
          phone,
          createdAt: serverTimestamp(),
        });

        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error("Phone sign-in error:", err);
      setError(err.message);
    }
  };

  const handleEmailSignUp = async () => {
    if (!email || !password || !name) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      // First create the user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update the user's display name
      await updateProfile(user, {
        displayName: name
      });

      // Batch write both documents
      const batch = writeBatch(db);

      // Create initial user document
      const userRef = doc(db, "users", user.uid);
      batch.set(userRef, {
        name,
        email,
        createdAt: serverTimestamp(),
      });

      // Create initial profile document
      const profileRef = doc(db, "profiles", user.uid);
      batch.set(profileRef, {
        name,
        email,
        createdAt: serverTimestamp(),
      });

      // Commit the batch
      await batch.commit();

      router.push("/profile");
    } catch (err: any) {
      console.error("Sign-up error:", err);
      if (err.code === 'permission-denied') {
        setError("Permission error. Please try again or contact support.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-row">
      {/* Left Section - MedVault Info */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-teal-600 to-teal-700 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
            <rect width="100" height="100" fill="url(#grid)"/>
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-12">
            <div className="bg-white/10 p-3 rounded-xl">
              <Image src="/logo.svg" alt="MedVault Logo" width={48} height={48} className="w-12 h-12" />
            </div>
            <h1 className="text-4xl font-bold text-white">Medvault</h1>
          </div>
          
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white leading-tight">
              Join MedVault Today <br />For Better Health Management
            </h2>
            <p className="text-lg text-teal-100 leading-relaxed max-w-md">
              Create your account and start managing your healthcare journey with our comprehensive suite of tools.
            </p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 rounded-lg p-2">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-teal-100">Secure data protection</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/10 rounded-lg p-2">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-teal-100">Smart reminders</span>
            </div>
          </div>
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 rounded-lg p-2">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span className="text-teal-100">Digital records</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/10 rounded-lg p-2">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-teal-100">Easy scheduling</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Sign Up Form */}
      <div className="flex-1 bg-white p-8 flex items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
            <p className="mt-2 text-gray-600">Join us to manage your healthcare journey.</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Form fields for sign up */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              onClick={handleEmailSignUp}
              disabled={loading}
              className={`w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition-colors ${
                loading && "opacity-50 cursor-not-allowed"
              }`}
            >
              {loading ? "Signing Up..." : "Sign Up"}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or sign up with</span>
              </div>
</div>

<div className="grid grid-cols-2 gap-4">
  <button
    onClick={handleGoogleSignIn}
    className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
  >
    <Image src="/google.svg" alt="Google" width={20} height={20} className="mr-2" />
    Google
  </button>
  <button
    onClick={handleAppleSignIn}
    className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
  >
    <Image src="/apple.svg" alt="Apple" width={20} height={20} className="mr-2" />
    Apple
  </button>
</div>
            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <a href="/sign-in" className="text-teal-600 hover:text-teal-700 font-medium">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;