"use client";
import React, { useState, useEffect } from "react";
import { auth, db, storage } from "@/lib/firebase"; // Firebase configuration
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import Image from "next/image";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();

  // ✅ Fetch authenticated user data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchUserData(currentUser.uid);
      } else {
        router.push("/sign-in");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // ✅ Fetch existing profile data
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

  // ✅ Handle image selection
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

  // ✅ Upload image to Firebase Storage
  const uploadImage = async () => {
    if (!profileImage || !user) return null;

    const imageRef = ref(storage, `profileImages/${user.uid}/${uuidv4()}`);
    await uploadBytes(imageRef, profileImage);
    const downloadURL = await getDownloadURL(imageRef);
    return downloadURL;
  };

  // ✅ Save Profile Data
  const handleSave = async () => {
    if (!name || !dob || !weight || !height || !bloodGroup) {
      setMessage("Please fill in all fields.");
      return;
    }

    if (!user) {
      setMessage("User not authenticated.");
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
        userId: user.uid,
        email: user.email,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "profiles", user.uid), userProfile);

      setMessage("Profile saved successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      setMessage("Failed to save profile.");
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h2 className="text-2xl font-semibold mb-4">Profile Details</h2>
      {message && (
        <p className={`${message.includes("successfully") ? "text-green-500" : "text-red-500"}`}>
          {message}
        </p>
      )}

      <div className="space-y-4">
        {/* Profile Image */}
        <div>
          <label className="block text-gray-700">Profile Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full p-2 border rounded"
          />
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Profile Preview"
              className="mt-4 w-32 h-32 rounded-full object-cover border"
            />
          )}
        </div>

        {/* Name */}
        <div>
          <label className="block text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block text-gray-700">Date of Birth</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Weight */}
        <div>
          <label className="block text-gray-700">Weight (kg)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Height */}
        <div>
          <label className="block text-gray-700">Height (cm)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Blood Group */}
        <div>
          <label className="block text-gray-700">Blood Group</label>
          <input
            type="text"
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Save Button */}
        <div className="mt-4">
          <button
            onClick={handleSave}
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
