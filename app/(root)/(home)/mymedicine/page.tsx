"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

interface Medicine {
  name: string;
  frequency: string;
  duration: string;
}

const MyMedicinePage = () => {
  const [currentMedications, setCurrentMedications] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeds = async () => {
      const auth = getAuth();

      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          setCurrentMedications([]);
          setLoading(false);
          return;
        }

        try {
          const q = query(
            collection(db, "prescriptions"),
            where("uid", "==", user.uid)
          );

          const snapshot = await getDocs(q);
          const meds: Medicine[] = [];

          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.medicines) {
              data.medicines.forEach((med: any) => {
                meds.push({
                  name: med["Drug Name"],
                  frequency: med["Frequency"],
                  duration: med["Duration"],
                });
              });
            }
          });

          setCurrentMedications(meds);
        } catch (error) {
          console.error("Error fetching medications:", error);
        }

        setLoading(false);
      });
    };

    fetchMeds();
  }, []);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-semibold mb-4">My Medications</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : currentMedications.length > 0 ? (
        <div className="space-y-4">
          {currentMedications.map((med, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium">{med.name}</h3>
              <p className="text-gray-600">Frequency: {med.frequency}</p>
              <p className="text-gray-600">Duration: {med.duration}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No medications found.</p>
      )}
    </div>
  );
};

export default MyMedicinePage;
