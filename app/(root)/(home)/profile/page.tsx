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
    if (user) {
      fetchUserData(user.uid);
    }
  }, [user]);

  const fetchUserData = async (userId: string) => {
    const userDoc = await getDoc(doc(db, "profiles", userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      setName(data.name);
      setDob(data.dob);
      setWeight(data.weight);
      setHeight(data.height);
      setBloodGroup(data.bloodGroup);
      setImagePreview(data.profileImage || null);
    }
  };

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
    if (!profileImage || !user) return null;

    const imageRef = ref(storage, `profileImages/${user.uid}/${uuidv4()}`);
    await uploadBytes(imageRef, profileImage);
    const downloadURL = await getDownloadURL(imageRef);
    return downloadURL;
  };

  const handleSave = async () => {
    if (!name || !dob || !weight || !height || !bloodGroup) {
      setMessage("Please fill in all fields.");
      return;
    }

    try {
      const imageURL = await uploadImage();

      const userProfile = {
        name,
        dob,
        weight,
        height,
        bloodGroup,
        profileImage: imageURL || imagePreview || "",
        uid: user?.uid || "", // Changed from userId to uid
        email: user?.email || "",
        createdAt: new Date().toISOString(),
      };

      if (user) {
        await setDoc(doc(db, "profiles", user.uid), userProfile);
      } else {
        setMessage("User is not authenticated.");
      }
      setMessage("Profile saved successfully!");
    } catch (error) {
      setMessage("Error saving profile.");
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center">
      <h2 className="text-2xl font-semibold mb-4">Profile Details</h2>
      {message && (
        <p className={`${message.includes("successfully") ? "text-green-500" : "text-red-500"}`}>
          {message}
        </p>
      )}

      {/* Profile Image */}
      <div className="relative w-32 h-32 cursor-pointer" onClick={() => document.getElementById("fileInput")?.click()}>
        {imagePreview ? (
          <img
            src={imagePreview}
            alt="Profile"
            className="w-32 h-32 rounded-full object-cover border"
          />
        ) : (
          <div className="w-32 h-32 bg-gray-300 rounded-full flex items-center justify-center text-gray-700">
            Upload Image
          </div>
        )}
        <input
          id="fileInput"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
      </div>

      <div className="space-y-4 w-full max-w-md mt-6">
        <div>
          <label className="block text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-gray-700">Date of Birth</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-gray-700">Weight (kg)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-gray-700">Height (cm)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-gray-700">Blood Group</label>
          <input
            type="text"
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <button onClick={handleSave} className="bg-blue-500 text-white px-4 py-2 rounded-md w-full">
          Save Profile
        </button>
      </div>
    </div>
  );
};

export default Profile;