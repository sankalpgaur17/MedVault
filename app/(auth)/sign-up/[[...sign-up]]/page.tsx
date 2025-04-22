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
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

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

      router.push("/dashboard");
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });

      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        email,
        photoURL: userCredential.user.photoURL || "",
        createdAt: serverTimestamp(),
      });

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Email sign-up error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex h-screen w-full items-center justify-end pr-8 relative">
      <Image
        src="/bg.jpg"
        alt="bg-image"
        layout="fill"
        objectFit="cover"
        className="absolute inset-0 z-0"
      />

      <div className="w-full max-w-md mr-12 bg-white p-8 rounded-lg shadow-lg z-10">
        <h2 className="text-2xl font-bold mb-4">Sign Up</h2>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="flex space-x-4 mb-4">
          <button
            onClick={handleGoogleSignIn}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Google
          </button>
          <button
            onClick={handleAppleSignIn}
            className="w-full bg-black text-white px-4 py-2 rounded hover:bg-gray-900"
          >
            Apple
          </button>
        </div>

        <div id="recaptcha-container"></div>

        <input
          type="tel"
          placeholder="Phone Number (e.g., +1234567890)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full p-3 border rounded mb-4"
        />

        <button
          onClick={handlePhoneSignIn}
          className="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        >
          Send OTP
        </button>

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 border rounded mb-4"
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded mb-4"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border rounded mb-4"
        />

        <button
          onClick={handleEmailSignUp}
          disabled={loading}
          className={`w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ${
            loading && "opacity-50 cursor-not-allowed"
          }`}
        >
          {loading ? "Signing Up..." : "Sign Up with Email"}
        </button>

        <p className="text-center mt-4">
          Already have an account?{" "}
          <a href="/sign-in" className="text-blue-500 hover:underline">
            Sign In
          </a>
        </p>
      </div>
    </main>
  );
};

export default SignUpPage;