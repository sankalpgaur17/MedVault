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
  prescribedDate?: string | null;
  hospitalName?: string | null; // Add hospitalName to interface
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
  extractedDetails?: {
    medicines: ExtractedMedicine[];
    hospitalName?: string | null;
  };
}

// Update the calculateRemainingDays function to handle different date formats
const calculateRemainingDays = (startDate: Date | string, durationInDays: number): number => {
  if (!startDate || !durationInDays) return 0;

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  if (!isValid(start)) return 0;

  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + durationInDays);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const remaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return remaining > 0 ? remaining : 0;
};

const MyMedicinePage = () => {
  const [currentMedications, setCurrentMedications] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true); // Loading state for fetching medications
  const [user, setUser] = useState<User | null>(null); // Keep track of user state (using User type)
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'all' | 'current' | 'past'>('all');

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

  // Filter medications based on search query and active tab
  const getFilteredMedications = () => {
    let filtered = currentMedications;

    // First filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(med => 
        med.medicineName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Then filter by tab
    switch (activeTab) {
      case 'current':
        return filtered.filter(med => med.status === 'active');
      case 'past':
        return filtered.filter(med => med.status === 'completed');
      default:
        return filtered;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Updated Header Section to match prescription page */}
      <header className="mb-6 md:mb-10 border-b border-gray-200 pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 leading-tight">Medications</h1>
        <p className="text-gray-600 mt-2 text-base md:text-lg">
          Track and manage your ongoing medications. Never miss a dose with smart reminders.
        </p>
      </header>

      {/* Main Content Container - Updated with new width and margin */}
      <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 mx-4 md:mx-6">
        {/* Search and Filter Bar */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search medicines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <svg 
                className="absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-2 overflow-x-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'current', label: 'Current' },
                { id: 'past', label: 'Past' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'all' | 'current' | 'past')}
                  className={`px-6 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'bg-teal-50 text-teal-700 border border-teal-200'
                      : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                    }`}
                >
                  {tab.label}
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs
                    ${activeTab === tab.id
                      ? 'bg-white border border-teal-200'
                      : 'bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {tab.id === 'all' 
                      ? currentMedications.length
                      : tab.id === 'current'
                        ? currentMedications.filter(med => med.status === 'active').length
                        : currentMedications.filter(med => med.status === 'completed').length
                    }
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Medications Grid - Updated padding and gap */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {getFilteredMedications().map((med) => {
            // Get the correct date and duration values
            const prescriptionDate = med.extractedDate 
              ? new Date(med.extractedDate)
              : new Date(med.formDate.seconds * 1000);
            
            // Use the duration from the medicine details
            const duration = typeof med.duration === 'number' 
              ? med.duration 
              : typeof med.duration === 'string' 
                ? parseInt(med.duration) 
                : 0;
            
            // Calculate remaining days
            const remainingDays = calculateRemainingDays(prescriptionDate, duration);
            const isCompleted = remainingDays === 0;
      
            return (
              <div key={med.id} className="bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-shadow duration-300">
                {/* Medicine Header with Icon and Name */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 truncate">{med.medicineName}</h3>
                      {med.dosage && (
                        <p className="text-sm text-gray-600 mt-0.5">{med.dosage}</p>
                      )}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium
                      ${isCompleted 
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-teal-50 text-teal-700'
                      }`}
                    >
                      {isCompleted ? 'Completed' : 'Active'}
                    </span>
                  </div>
                </div>

                {/* Medicine Details */}
                <div className="p-5 space-y-3">
                  {med.hospitalName && (
                    <div className="flex items-center text-gray-600">
                      <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {med.hospitalName}
                    </div>
                  )}

                  <div className="flex items-center text-gray-600">
                    <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {format(prescriptionDate, 'MMMM d, yyyy')}
                  </div>

                  {med.frequency && (
                    <div className="flex items-center text-gray-600">
                      <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {med.frequency}
                    </div>
                  )}
                </div>

                {/* Days Remaining */}
                {!isCompleted && remainingDays > 0 && (
                  <div className="px-5 py-4 bg-white border-t border-gray-100 rounded-b-xl">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Days Remaining</span>
                      <span className="font-medium text-teal-700">{remainingDays} days</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-teal-500 rounded-full" 
                        style={{ 
                          width: `${Math.min((remainingDays / duration) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* No Results Message */}
        {getFilteredMedications().length === 0 && (
          <div className="text-center py-10">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-xl font-medium text-gray-900">
              {searchQuery
                ? "No medications found matching your search"
                : activeTab === 'current'
                  ? "No current medications"
                  : activeTab === 'past'
                    ? "No past medications"
                    : "No medications found"
              }
            </p>
            <p className="mt-2 text-gray-600">
              {searchQuery
                ? "Try adjusting your search terms"
                : "Your medications will appear here once added"
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyMedicinePage;