"use client";

import React, { useState } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./mypres.css";

interface Prescription {
  id: string;
  doctorName: string;
  prescriptionDate: string;
  fileURL: string;
  notes: string;
}

const MyPrescriptionPage = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doctorName, setDoctorName] = useState("");
  const [prescriptionDate, setPrescriptionDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const extractMedicinesFromImage = async (base64Image: string) => {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyA_k9kGr94-NBRnDmZB_VjymyKo1zni2ac", {
      method: "POST",
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Extract and return a JSON array containing the following details:
                - Sr.
                - Drug Name
                - Frequency (e.g., once daily, twice daily)
                - Duration (e.g., 10 days)
                Return only valid JSON.`,
              },
              {
                inlineData: {
                  mimeType: file?.type,
                  data: base64Image,
                },
              },
            ],
          },
        ],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const match = text.match(/\[.*?\]/s);
    return match ? JSON.parse(match[0]) : [];
  };

  const handleSubmit = async () => {
    if (doctorName && prescriptionDate && file) {
      try {
        const storageRef = ref(storage, `prescriptions/${file.name}`);
        await uploadBytes(storageRef, file);
        const fileURL = await getDownloadURL(storageRef);

        // Convert to base64 for Gemini
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = (reader.result as string).split(",")[1];
          const medicines = await extractMedicinesFromImage(base64String);

          // Store prescription in Firestore
          await addDoc(collection(db, "prescriptions"), {
            doctorName,
            prescriptionDate,
            fileURL,
            notes,
            medicines,
            createdAt: new Date(),
          });

          setPrescriptions((prev) => [
            ...prev,
            { id: Date.now().toString(), doctorName, prescriptionDate, fileURL, notes },
          ]);
          resetForm();
          alert("✅ Prescription uploaded successfully!");
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("Upload error:", error);
        alert("❌ Failed to upload.");
      }
    } else {
      alert("Please fill all fields and upload a file.");
    }
  };

  const resetForm = () => {
    setDoctorName("");
    setPrescriptionDate("");
    setFile(null);
    setNotes("");
  };

  return (
    <div className="my-prescription-page">
      <h1 className="text-2xl font-semibold mb-4">My Prescription</h1>

      <div className="prescription-form p-4 bg-gray-100 rounded-md mb-8">
        <h3 className="text-xl font-semibold mb-2">Upload New Prescription</h3>

        <input type="text" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="Doctor's Name" className="input" />
        <input type="date" value={prescriptionDate} onChange={(e) => setPrescriptionDate(e.target.value)} className="input" />
        <input type="file" accept="image/*" onChange={handleFileChange} className="input" />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional Notes" className="input" />

        <button onClick={handleSubmit} className="bg-blue-600 text-white rounded-md px-4 py-2 mt-4">Upload Prescription</button>
      </div>
    </div>
  );
};

export default MyPrescriptionPage;
