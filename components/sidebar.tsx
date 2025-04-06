"use client";

import React, { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";  // Firebase authentication
import { signOut, onAuthStateChanged, User } from "firebase/auth";

interface SidebarProps {
  selectedOption: string;
  setSelectedOption: (option: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedOption, setSelectedOption }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Load profile image from localStorage
    const savedImage = localStorage.getItem("profileImage");
    if (savedImage) setProfileImage(savedImage);

    return () => unsubscribe();
  }, []);

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result as string;
        setProfileImage(base64Image);
        localStorage.setItem("profileImage", base64Image);
        setShowMenu(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetToDefault = () => {
    setProfileImage(null);
    localStorage.removeItem("profileImage");
    setShowMenu(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User logged out");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const options = [
    { name: "Dashboard", icon: "🏠" },
    { name: "Profile", icon: "👤" },
    { name: "Appointments", icon: "📅" },
    { name: "My Medicines", icon: "💊" },
    { name: "My Prescriptions", icon: "📝" },
    { name: "Lab Tests", icon: "🔬" },
    { name: "My Bills", icon: "💸" },
    { name: "Insurance", icon: "🛡️" },
  ];

  return (
    <aside className="w-64 bg-blue-900 text-white flex flex-col p-6 space-y-8 h-screen">
      <div className="relative flex items-center space-x-4 mb-8">
        {/* Profile Image */}
        <div
          className="relative w-16 h-16 rounded-full border-2 border-white overflow-hidden cursor-pointer"
          onClick={() => setShowMenu((prev) => !prev)}
        >
          <img
            src={profileImage || "/profile.jpg"}
            alt="Profile Picture"
            className="w-full h-full object-cover"
          />
          {showMenu && (
            <div className="absolute top-full mt-2 left-0 w-48 bg-white text-gray-800 rounded-md shadow-lg z-10">
              <label
                htmlFor="profileImageUpload"
                className="block px-4 py-2 text-sm cursor-pointer hover:bg-gray-200 rounded-t-md"
              >
                Upload New Picture
              </label>
              <input
                type="file"
                id="profileImageUpload"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={resetToDefault}
                className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-200"
              >
                Reset to Default
              </button>
            </div>
          )}
        </div>

        {/* User Info */}
        <div>
          <p className="text-lg font-semibold">{user?.displayName || "Guest"}</p>
          <p className="text-sm opacity-70">{user ? "Patient" : "Not Signed In"}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col space-y-4">
        {options.map((option) => (
          <button
            key={option.name}
            onClick={() => setSelectedOption(option.name)}
            className={`flex items-center space-x-2 p-2 rounded-md hover:bg-blue-700 ${
              selectedOption === option.name ? "bg-blue-700" : ""
            }`}
          >
            <span className="text-2xl">{option.icon}</span>
            <span>{option.name}</span>
          </button>
        ))}
      </nav>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="bg-red-500 text-white px-4 py-2 rounded-md mt-4 hover:bg-red-700"
      >
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;
