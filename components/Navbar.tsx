"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

interface NavbarProps {
  selectedOption: string;
  setSelectedOption: (option: string) => void;
}

const navOptions = [
  { name: "Dashboard" },
  { name: "Appointments" },
  { name: "My Medicines" },
  { name: "My Prescriptions" },
  { name: "Lab Test" }, // Changed from "Lab Tests" to "Lab Test"
  { name: "Bills" },
];

const Navbar = ({ selectedOption, setSelectedOption }: NavbarProps) => {
  const { user } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Guest");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async (userId: string) => {
      if (!userId) return;
      
      try {
        const userDoc = await getDoc(doc(db, "profiles", userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.profileImage) {
            setProfileImage(data.profileImage);
          }
          if (data.name) {
            setUserName(data.name);
          } else {
            setUserName(user?.displayName || "User");
          }
        } else {
          setUserName(user?.displayName || "User");
          setProfileImage(null);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setUserName(user?.displayName || "User");
        setProfileImage(null);
      }
    };

    if (user?.uid) {
      fetchUserProfile(user.uid);
    } else {
      setProfileImage(null);
      setUserName("Guest");
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSelectedOption("Dashboard");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return (
    <div className="w-full">
      <nav className="flex items-center justify-between px-8 py-4 bg-teal-600 text-white shadow-lg">
        {/* Logo Section - Updated with fallback */}
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            {/* Replace Image with SVG fallback */}
            <svg 
              className="w-8 h-8 text-teal-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" 
              />
            </svg>
          </div>
          <span className="text-2xl font-bold tracking-wide">MedVault</span>
        </div>

        {/* Profile Section - Updated with fallback */}
        <div className="relative">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            {/* Profile Image with Fallback */}
            <div className="w-11 h-11 rounded-full border-2 border-white overflow-hidden bg-teal-700 flex items-center justify-center">
              {profileImage ? (
                <Image
                  src={profileImage}
                  alt="Profile"
                  width={44}
                  height={44}
                  className="rounded-full"
                />
              ) : (
                <span className="text-xl font-semibold text-white">
                  {userName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-lg font-medium">{userName}</span>
          </div>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50">
              <div
                onClick={() => {
                  setSelectedOption("Profile");
                  setShowProfileMenu(false);
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Profile
              </div>
              <div
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer"
              >
                Logout
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Navigation Menu */}
      <div className="bg-white border-b flex items-center justify-center overflow-x-auto">
        {navOptions.map((option) => (
          <div
            key={option.name}
            onClick={() => setSelectedOption(option.name)}
            className={`px-8 py-4 text-lg font-semibold cursor-pointer whitespace-nowrap ${
              selectedOption === option.name
                ? 'border-b-2 border-teal-600 text-teal-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {option.name}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Navbar;