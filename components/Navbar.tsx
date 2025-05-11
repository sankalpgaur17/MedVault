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
  { name: "Insurance" },
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
      <nav className="flex items-center justify-between px-8 py-4 bg-emerald-800 text-white shadow-lg">
        {/* Logo Section */}
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10">
            <Image
              src="/logo.svg"
              alt="MedVault Logo"
              width={40}
              height={40}
              className="w-full h-full"
            />
          </div>
          <span className="text-2xl font-bold tracking-wide">MedVault</span>
        </div>

        {/* Profile Section */}
        <div className="relative">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <Image
              src={profileImage || "/profile.jpg"}
              alt="Profile"
              width={44}
              height={44}
              className="rounded-full border-2 border-white"
            />
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
                ? 'border-b-2 border-emerald-600 text-emerald-600'
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