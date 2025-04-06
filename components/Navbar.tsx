"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const Navbar = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-blue-500 text-white shadow-md">
      <Link href="/" className="flex items-center space-x-3">
        <Image
          src="/logo.svg"
          alt="logo"
          width={50}
          height={50}
          className="cursor-pointer"
        />
        <span className="text-xl font-semibold">MedVault</span>
      </Link>

      <div className="flex items-center space-x-4">
        {user ? (
          <>
            <div className="flex items-center space-x-3">
              {user.photoURL && (
                <Image
                  src={user.photoURL}
                  alt="profile"
                  width={40}
                  height={40}
                  className="rounded-full border border-white"
                />
              )}
              <span>{user.displayName || "User"}</span>
            </div>
            <button
              onClick={async () => {
                await logout();
                router.push("/sign-in");
              }}
              className="bg-white text-blue-500 px-4 py-2 rounded-md hover:bg-gray-200"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/sign-in">
              <button className="bg-white text-blue-500 px-4 py-2 rounded-md hover:bg-gray-200">
                Sign In
              </button>
            </Link>
            <Link href="/sign-up">
              <button className="bg-white text-blue-500 px-4 py-2 rounded-md hover:bg-gray-200">
                Sign Up
              </button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
