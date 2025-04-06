"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

interface Medicine {
  name: string;
  frequency: string;
  duration: string;
}

const MyMedicinePage = () => {
  const [currentMedications, setCurrentMedications] = useState<Medicine[]>([]);

  useEffect(() => {
    const fetchMeds = async () => {
      const snapshot = await getDocs(collection(db, "prescriptions"));
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
    };

    fetchMeds();
  }, []);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-semibold mb-4">My Medications</h1>

      <div className="space-y-4">
        {currentMedications.length > 0 ? (
          currentMedications.map((med, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium">{med.name}</h3>
              <p className="text-gray-600">Frequency: {med.frequency}</p>
              <p className="text-gray-600">Duration: {med.duration}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No medications found.</p>
        )}
      </div>
    </div>
  );
};

export default MyMedicinePage;
