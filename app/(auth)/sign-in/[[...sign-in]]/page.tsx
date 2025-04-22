"use client";
import { useEffect, useRef, useState } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Image from "next/image";

const SignInPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: (response: any) => {
          console.log("reCAPTCHA solved");
        },
        "expired-callback": () => {
          console.warn("reCAPTCHA expired");
        },
      });

      // Explicitly render to avoid edge cases
      recaptchaVerifierRef.current.render().catch(console.error);
    }
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/profile");
    } catch (error) {
      console.error("Email Sign-In Error:", error);
      setError("Invalid email or password");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/profile");
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      setError("Google sign-in failed");
    }
  };

  const handlePhoneSignIn = async () => {
    try {
      if (!recaptchaVerifierRef.current) throw new Error("RecaptchaVerifier not ready");

      const confirmation = await signInWithPhoneNumber(auth, phone, recaptchaVerifierRef.current);
      setConfirmationResult(confirmation);
    } catch (error) {
      console.error("Phone Sign-In Error:", error);
      setError("Failed to send OTP");
    }
  };

  const verifyOtp = async () => {
    try {
      if (confirmationResult) {
        await confirmationResult.confirm(otp);
        router.push("/profile");
      }
    } catch (error) {
      console.error("OTP Verification Error:", error);
      setError("Invalid OTP");
    }
  };

  return (
    <main className="flex h-screen w-full items-center justify-end pr-8 relative">
      <Image
        src="/bg.jpg"
        alt="bg-image"
        fill
        className="absolute inset-0 z-0 object-cover"
      />
      <div className="w-full max-w-md mr-12 bg-white p-8 rounded-lg shadow-lg z-10">
        <h2 className="text-2xl font-bold mb-4">Sign In</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}

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
          onClick={handleSignIn}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Sign In
        </button>

        <button
          onClick={handleGoogleSignIn}
          className="w-full bg-red-500 text-white px-4 py-2 rounded mt-2 hover:bg-red-600"
        >
          Sign In with Google
        </button>

        <input
          type="text"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full p-3 border rounded mt-4"
        />

        <button
          onClick={handlePhoneSignIn}
          className="w-full bg-green-500 text-white px-4 py-2 rounded mt-2 hover:bg-green-600"
        >
          Send OTP
        </button>

        {confirmationResult && (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full p-3 border rounded mt-4"
            />

            <button
              onClick={verifyOtp}
              className="w-full bg-purple-500 text-white px-4 py-2 rounded mt-2 hover:bg-purple-600"
            >
              Verify OTP
            </button>
          </>
        )}

        <p className="text-center mt-4">
          Don’t have an account?{" "}
          <a href="/sign-up" className="text-blue-500 hover:underline">
            Sign Up
          </a>
        </p>
      </div>
      <div id="recaptcha-container"></div>
    </main>
  );
};

export default SignInPage;
