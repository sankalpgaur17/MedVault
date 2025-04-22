"use client";

import React, { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./mypres.css";

interface Prescription {
  id: string;
  doctorName: string;
  prescriptionDate: string;
  fileURL: string;
  notes: string;
  medicines?: any[];
}

const MyPrescriptionPage = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doctorName, setDoctorName] = useState("");
  const [prescriptionDate, setPrescriptionDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [userUid, setUserUid] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);

        const q = query(
          collection(db, "prescriptions"),
          where("uid", "==", user.uid)
        );

        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const data: Prescription[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Prescription[];
          setPrescriptions(data.reverse());
        });

        return () => unsubscribeSnapshot();
      } else {
        setPrescriptions([]);
        setUserUid(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const extractMedicinesFromImage = async (base64Image: string) => {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyA_k9kGr94-NBRnDmZB_VjymyKo1zni2ac",
      {
        method: "POST",
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Extract and return a JSON array with:
                  - Sr.
                  - Drug Name
                  - Frequency
                  - Duration
                  - Date
                  Only return valid JSON array.`,
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
      }
    );

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const match = text.match(/\[.*?\]/s);
    return match ? JSON.parse(match[0]) : [];
  };

  const handleSubmit = async () => {
    if (doctorName && prescriptionDate && file && userUid) {
      try {
        const storageRef = ref(
          storage,
          `prescriptions/${Date.now()}-${file.name}`
        );
        await uploadBytes(storageRef, file);
        const fileURL = await getDownloadURL(storageRef);

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = (reader.result as string).split(",")[1];
          const medicines = await extractMedicinesFromImage(base64String);

          // Add userId to the prescription data
          await addDoc(collection(db, "prescriptions"), {
            uid: userUid, // userId is now saved as uid
            doctorName,
            prescriptionDate,
            fileURL,
            notes,
            medicines,
            createdAt: new Date(), // Added userId field here
          });

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

        <input
          type="text"
          value={doctorName}
          onChange={(e) => setDoctorName(e.target.value)}
          placeholder="Doctor's Name"
          className="input"
        />
        <input
          type="date"
          value={prescriptionDate}
          onChange={(e) => setPrescriptionDate(e.target.value)}
          className="input"
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="input"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional Notes"
          className="input"
        />

        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white rounded-md px-4 py-2 mt-4"
        >
          Upload Prescription
        </button>
      </div>

      <div className="uploaded-prescriptions mt-8">
        <h3 className="text-xl font-semibold mb-2">Uploaded Prescriptions</h3>
        {prescriptions.length === 0 ? (
          <p>No prescriptions uploaded yet.</p>
        ) : (
          <div className="grid gap-4">
            {prescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className="bg-white shadow-md rounded-md p-4"
              >
                <p>
                  <strong>Doctor:</strong> {prescription.doctorName}
                </p>
                <p>
                  <strong>Date:</strong> {prescription.prescriptionDate}
                </p>
                <p>
                  <strong>Notes:</strong> {prescription.notes}
                </p>
                <a
                  href={prescription.fileURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  View Image
                </a>

                {prescription.medicines && (
                  <>
                    <p className="mt-2 font-semibold">Medicines:</p>
                    <ul className="list-disc list-inside">
                      {prescription.medicines.map((med, idx) => (
                        <li key={idx}>
                          {med["Sr."]}. {med["Drug Name"]} -{" "}
                          {med["Frequency"]} for {med["Duration"]}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPrescriptionPage;
