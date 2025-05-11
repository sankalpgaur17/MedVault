"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth"; // Import User type
import { format, differenceInDays, isValid } from 'date-fns'; // Import isValid for date validation
import Image from "next/image";

// Interface matching the structure of extracted medicines saved in Firestore
interface ExtractedMedicine {
  medicineName: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: number | string | null; // Duration can be number, string, or null
}

// Interface for the data structure fetched for each medication entry
interface Medicine {
  id: string; // Unique ID for each medicine item (combining prescription ID and medicine index)
  medicineName: string;
  hospitalName?: string | null; // Hospital name from the prescription document
  dosage?: string | null;
  frequency?: string | null;
  duration?: number | string | null; // Original duration value
  formDate: Timestamp; // Date from form input (renamed from prescriptionDate)
  extractedDate?: string; // Date from the prescription image
  status: 'active' | 'completed';
}


const MyMedicinePage = () => {
  const [currentMedications, setCurrentMedications] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true); // Loading state for fetching medications
  const [user, setUser] = useState<User | null>(null); // Keep track of user state (using User type)

  // Effect to listen for auth state changes
  useEffect(() => {
    setLoading(true); // Start loading when auth state check begins
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setCurrentMedications([]);
        setLoading(false); // Stop loading if no user is logged in
      }
    });

    // Clean up the subscription
    return () => unsubscribe();
  }, []); // Run only once on mount

  // Effect to fetch medications when user state changes
  useEffect(() => {
    const fetchMeds = async () => {
      if (!user) {
        // If user is null, it means they are not logged in or auth state is not ready
        // The previous effect handles setting loading to false in the !currentUser case.
        return;
      }

      try {
        // Query prescriptions for the current user
        const q = query(
          collection(db, "prescriptions"),
          where("uid", "==", user.uid)
          // Add orderBy if you want to sort prescriptions, e.g., orderBy("date", "desc")
        );

        const snapshot = await getDocs(q);
        const meds: Medicine[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          const prescriptionId = doc.id; // Get the prescription document ID

          // Get prescription-level data
          const hospitalName = data.hospitalName as string | undefined;

          if (data.medicines && Array.isArray(data.medicines)) {
            data.medicines.forEach((med: any, medIndex: number) => { // Use any type for raw data from Firestore
              let daysRemaining: number | null = null;
              const duration = med.duration as number | string | null; // Get duration from extracted data

              // Use extracted date if available, fall back to form date
              const prescriptionDate = med.extractedDate 
                ? new Date(med.extractedDate)
                : new Date(data.date.seconds * 1000);

              // Calculate days remaining using extracted date when available
              if (isValid(prescriptionDate) && typeof duration === 'number' && duration > 0) {
                const endDate = new Date(prescriptionDate);
                endDate.setDate(endDate.getDate() + duration);

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const remaining = differenceInDays(endDate, today);
                daysRemaining = remaining > 0 ? remaining : 0;
              } else if (typeof duration === 'string' && duration.toLowerCase().includes('until finished')) {
                  // Handle specific string durations like "until finished"
                  daysRemaining = null; // Or a specific indicator like -1
              }
              // For other string durations or null, daysRemaining remains null


              meds.push({
                id: `${prescriptionId}-${medIndex}`, // Unique ID using prescription ID and medicine index
                medicineName: med.medicineName || med['Drug Name'] || 'N/A', // Use extracted key or fallback
                hospitalName: hospitalName || null, // Include hospital name
                dosage: med.dosage || med['Dose'] || null, // Use extracted key or fallback
                frequency: med.frequency || med['Frequency'] || 'N/A', // Use extracted key or fallback
                duration: duration, // Store the original extracted duration value
                formDate: data.date, // Store form date
                extractedDate: med.extractedDate, // Store extracted date
                status: daysRemaining !== null && daysRemaining > 0 ? 'active' : 'completed', // Determine status based on days remaining
              });
            });
          }
        });

        setCurrentMedications(meds);
      } catch (error) {
        console.error("Error fetching medications:", error);
        // Optionally set an error state here to display to the user
      }

      setLoading(false); // Stop loading after fetching is complete (success or error)
    };

    // Fetch meds only when the user state changes and is not null
    if (user !== null) {
        fetchMeds();
    }

  }, [user]); // Rerun when user state changes

  const calculateDaysRemaining = (prescriptionDate: Date, duration: number): number => {
    if (!prescriptionDate || !duration) return 0;
    const endDate = new Date(prescriptionDate);
    endDate.setDate(endDate.getDate() + duration);
    const today = new Date();
    const remaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return remaining > 0 ? remaining : 0;
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Medications</h1>

      {/* Authentication Required Message */}
      {!user && !loading && ( // Show if no user and not currently loading (initial check)
        <div className="text-center py-16 bg-white rounded-xl shadow-md max-w-2xl mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-red-400 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6.364-3.636l-1.414-1.414a9 9 0 1015.556 0L16.364 13.364A7 7 0 0012 15zm0 0a1 1 0 100-2 1 1 0 000 2z" />
          </svg>
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">Authentication Required</h2>
          <p className="text-gray-600 text-lg">Please log in to view your medications.</p>
          <p className="text-sm text-gray-500 mt-2">Protecting your health data starts with secure access.</p>
          {/* Add a login button or link here if applicable */}
          {/* <button className="mt-6 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out shadow-md">
            Go to Login
          </button> */}
        </div>
      )}

      {loading && user ? ( // Show loading only if user is logged in and data is being fetched
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 text-lg">Loading medications...</p>
        </div>
      ) : user && currentMedications.length > 0 ? ( // Show list if user logged in and has medications
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> {/* Responsive Grid */}
          {currentMedications.map((med) => (
            <div key={med.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200 relative"> {/* Card Styling */}
              <div className="flex justify-between items-start mb-4">
                {/* Pill Icon + Medicine Name */}
                <div className="flex items-start space-x-3">
                  <Image
                    src="/pill-icon.svg"
                    alt="Medicine"
                    width={24}
                    height={24}
                    className="text-emerald-600 mt-1"
                  />
                  <h3 className="text-xl font-bold text-gray-900">
                    {med.medicineName}
                  </h3>
                </div>

                {/* Status Badge */}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  med.status === 'active' 
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {med.status === 'active' ? 'Active' : 'Completed'}
                </span>
              </div>

              {/* Days Remaining Box */}
              {typeof med.duration === 'number' && (
                <div className="bg-emerald-50 p-2 rounded-md inline-block mb-3">
                  <p className="text-sm font-medium text-emerald-800">
                    {calculateDaysRemaining(
                      med.extractedDate ? new Date(med.extractedDate) : new Date(med.formDate.seconds * 1000),
                      med.duration
                    )} days left
                  </p>
                </div>
              )}

              {/* Medicine Details */}
              <div className="space-y-2">
                {med.hospitalName && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Hospital:</span> {med.hospitalName}
                  </p>
                )}

                {med.dosage && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Dosage:</span> {med.dosage}
                  </p>
                )}

                {med.frequency && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Frequency:</span> {med.frequency}
                  </p>
                )}

                <p className="text-sm text-gray-600">
                  <span className="font-medium">Prescribed:</span> {' '}
                  {med.extractedDate 
                    ? format(new Date(med.extractedDate), 'dd MMM yyyy') + ' (from prescription)'
                    : format(new Date(med.formDate.seconds * 1000), 'dd MMM yyyy') + ' (from form)'}
                </p>

                {typeof med.duration === 'number' && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Duration:</span> {med.duration} days
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : user && currentMedications.length === 0 && !loading ? ( // Show no medications message if user logged in and list is empty
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 text-lg">No medications found for this user.</p>
        </div>
      ) : null /* Don't render anything if user is null and loading is false (handled by auth required message) */}
    </div>
  );
};

export default MyMedicinePage;
