"use client";
import React, { useState, useEffect } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const Profile = () => {
  const { user, requireAuth } = useAuth();
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    requireAuth();
    const loadProfile = async () => {
      if (!user) {
        console.log("No user found, skipping profile fetch");
        return;
      }

      try {
        console.log("Fetching profile for user:", user.uid);
        const profileRef = doc(db, "profiles", user.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const data = profileSnap.data();
          console.log("Profile data found:", data);
          setName(data.name || "");
          setDob(data.dob || "");
          setWeight(data.weight?.toString() || "");
          setHeight(data.height?.toString() || "");
          setBloodGroup(data.bloodGroup || "");
          setImagePreview(data.profileImage || null);
        } else {
          console.log("No profile found for user");
          // Clear form if no profile exists
          setName("");
          setDob("");
          setWeight("");
          setHeight("");
          setBloodGroup("");
          setImagePreview(null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setMessage("Failed to load profile data. Please try again.");
      }
    };

    loadProfile();
  }, [user]); // Only depend on user changes

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!profileImage || !user) {
      throw new Error("No image selected or user not logged in");
    }

    try {
      // Create reference with user's UID in path
      const imageRef = ref(storage, `profileImages/${user.uid}/${uuidv4()}`);
      
      // Upload image
      const snapshot = await uploadBytes(imageRef, profileImage);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error("Failed to upload image");
    }
  };

  const handleSave = async () => {
    if (!user) {
      setMessage("Please log in to save your profile.");
      return;
    }

    try {
      setMessage(""); // Clear previous messages

      // Validate data
      if (!name.trim()) {
        setMessage("Name is required");
        return;
      }

      // Create profile data
      const profileData: {
        name: string;
        dob: string | null;
        weight: number | null;
        height: number | null;
        bloodGroup: string | null;
        updatedAt: string;
        profileImage?: string; // Added profileImage property
      } = {
        name: name.trim(),
        dob: dob || null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        bloodGroup: bloodGroup || null,
        updatedAt: new Date().toISOString(),
      };

      // Only add image if it exists or was uploaded
      if (profileImage) {
        const imageURL = await uploadImage();
        profileData.profileImage = imageURL;
      }

      // Save to Firestore with merge option
      await setDoc(doc(db, "profiles", user.uid), profileData, { merge: true });
      
      console.log("Profile saved successfully");
      setMessage("Profile updated successfully!");

      // Refresh profile data
      const updatedProfile = await getDoc(doc(db, "profiles", user.uid));
      if (updatedProfile.exists()) {
        const data = updatedProfile.data();
        setImagePreview(data.profileImage || null);
      }

    } catch (error) {
      console.error("Error saving profile:", error);
      setMessage("Failed to save profile. Please try again.");
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header Section */}
      <header className="mb-6 md:mb-10 border-b border-gray-200 pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 leading-tight">Profile Settings</h1>
        <p className="text-gray-600 mt-2 text-base md:text-lg">
          Manage your personal information and medical details.
        </p>
      </header>

      {/* Main Content Section */}
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        {/* Profile Image Section */}
        <div className="bg-teal-600 px-8 py-12 flex flex-col items-center">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            <button 
              onClick={() => document.getElementById("fileInput")?.click()}
              className="absolute bottom-0 right-0 bg-teal-500 p-2 rounded-full shadow-lg hover:bg-teal-600 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <input
              id="fileInput"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-white">{name || 'Your Name'}</h2>
          <p className="text-teal-100">{user?.email}</p>
        </div>

        {/* Form Section */}
        <div className="p-8">
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes("successfully") 
                ? "bg-green-50 text-green-700 border border-green-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                placeholder="Enter your weight"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Height (cm)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                placeholder="Enter your height"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
              >
                <option value="">Select Blood Group</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;