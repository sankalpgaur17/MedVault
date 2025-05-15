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
  const [loading, setLoading] = useState(false);

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
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      switch (err.code) {
        case 'auth/user-not-found':
          setError("No account found with this email. Please sign up first.");
          break;
        case 'auth/wrong-password':
          setError("Incorrect password. Please try again.");
          break;
        case 'auth/invalid-email':
          setError("Please enter a valid email address.");
          break;
        case 'auth/user-disabled':
          setError("This account has been disabled. Please contact support.");
          break;
        case 'auth/too-many-requests':
          setError("Too many failed attempts. Please try again later.");
          break;
        default:
          setError("Failed to sign in. Please check your credentials.");
          console.error("Sign-in error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/dashboard"); // Changed from /profile to /dashboard
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
        router.push("/dashboard"); // Changed from /profile to /dashboard
      }
    } catch (error) {
      console.error("OTP Verification Error:", error);
      setError("Invalid OTP");
    }
  };

  const ErrorMessage = ({ message }: { message: string }) => (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
      <p className="text-sm font-medium">{message}</p>
    </div>
  );

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
              Your Personal Healthcare <br />Management Platform
            </h2>
            <p className="text-lg text-teal-100 leading-relaxed max-w-md">
              Securely manage your medical records, track medications, and stay on top of your healthcare journey.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/10 rounded-xl p-4">
              <div className="bg-white/10 rounded-lg p-2 w-10 h-10 mb-3">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">Medication Tracking</h3>
              <p className="text-teal-100 text-sm">Never miss a dose with smart reminders</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="bg-white/10 rounded-lg p-2 w-10 h-10 mb-3">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">Medical Records</h3>
              <p className="text-teal-100 text-sm">All your health data in one place</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="flex-1 bg-white p-8 flex items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Login</h2>
            <p className="mt-2 text-gray-600">Welcome back! Please login to your account.</p>
          </div>

          {error && <ErrorMessage message={error} />}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Enter your password"
              />
            </div>

            <button
              onClick={handleSignIn}
              className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Sign In
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
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
                onClick={() => {}} // Implement Apple sign in if needed
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Image src="/apple.svg" alt="Apple" width={20} height={20} className="mr-2" />
                Apple
              </button>
            </div>

            <p className="text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <a href="/sign-up" className="text-teal-600 hover:text-teal-700 font-medium">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Hidden reCAPTCHA container */}
      <div id="recaptcha-container"></div>
    </div>
  );
};

export default SignInPage;
