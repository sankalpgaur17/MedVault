"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import { parseISO, isValid, format } from "date-fns";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, onAuthStateChanged, Unsubscribe } from "firebase/auth";
import { createPrescriptionHash, verifyPrescriptionUniqueness, registerPrescription } from "@/lib/contracts/contract";
import "./mypres.css";

// Move interfaces to the top
interface PrescriptionDocData {
  uid: string;
  doctorName: string;
  date: Timestamp; // Store prescription date as Firestore Timestamp
  hospitalName?: string; // Added hospitalName field
  fileURL: string;
  notes: string;
  medicines?: ExtractedMedicine[]; // Use the new interface for medicines
  createdAt: Timestamp;
  prescribedDate?: string;
}

interface Prescription extends PrescriptionDocData {
  id: string;
}

// Interface for the extracted medicine details
interface ExtractedMedicine {
  medicineName: string;
  dosage?: string | null; // Dosage might be optional or null
  frequency?: string | null; // Standardized frequency (e.g., "once daily", "twice daily")
  duration?: number | string | null; // Duration as a number if possible, or original string/null
  prescribedDate?: string | null; // Add this field for the extracted date
}

const MyPrescriptionPage = () => {
  const { user } = useAuth() as { user: any }; // Type assertion for AuthContext
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doctorName, setDoctorName] = useState("");
  const [prescriptionDateString, setPrescriptionDateString] = useState(""); // Input date string
  const [hospitalName, setHospitalName] = useState(""); // State for hospital name
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>(""); // To display selected file name
  const [notes, setNotes] = useState("");
  const [userUid, setUserUid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Initial loading for auth state
  const [isUploading, setIsUploading] = useState(false); // For upload button loading state
  const [isExtracting, setIsExtracting] = useState(false); // Loading state for AI extraction
  const [fetchingBills, setFetchingBills] = useState(false);

  const unsubscribeSnapshotRef = useRef<Unsubscribe | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  // --- (useEffect for Auth State) ---
  useEffect(() => {
    setIsLoading(true);
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
      } else {
        setUserUid(null);
        setPrescriptions([]);
        // Unsubscribe from Firestore listener if user logs out
        if (unsubscribeSnapshotRef.current) {
          unsubscribeSnapshotRef.current();
          unsubscribeSnapshotRef.current = null;
        }
      }
      setIsLoading(false); // Auth state determined, stop initial loading
    });
    return () => {
      unsubscribeAuth();
      // Ensure Firestore listener is also unsubscribed on component unmount
      if (unsubscribeSnapshotRef.current) {
        unsubscribeSnapshotRef.current();
        unsubscribeSnapshotRef.current = null;
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount

  // --- (useEffect for Firestore Listener - Fetches documents for the logged-in user) ---
  useEffect(() => {
    if (!user?.uid) return;

    setFetchingBills(true);
    try {
      const q = query(
        collection(db, "prescriptions"),
        where("uid", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const prescriptionData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Prescription[];
          setPrescriptions(prescriptionData);
          setFetchingBills(false);
        },
        (error) => {
          console.error("Error fetching prescriptions:", error);
          setPrescriptions([]);
          setFetchingBills(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up prescription listener:", error);
      setFetchingBills(false);
    }
  }, [user]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // Basic file type and size validation
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(selectedFile.type)) {
          alert("❌ Invalid file type. Please upload a JPG, PNG, or PDF.");
          setFile(null);
          setFileName("");
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
      }

      if (selectedFile.size > maxSize) {
          alert("❌ File size exceeds the 5MB limit.");
          setFile(null);
          setFileName("");
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
      }

      setFile(selectedFile);
      setFileName(selectedFile.name);
    } else {
      setFile(null);
      setFileName("");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
    e.currentTarget.classList.add('border-teal-500', 'bg-teal-50'); // Optional: add drag-over styles
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('border-teal-500', 'bg-teal-50'); // Optional: remove drag-over styles
  };


  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-teal-500', 'bg-teal-50'); // Optional: remove drag-over styles
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const droppedFile = e.dataTransfer.files[0];
         // Basic file type and size validation
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(droppedFile.type)) {
            alert("❌ Invalid file type. Please upload a JPG, PNG, or PDF.");
             setFile(null);
             setFileName("");
             if (fileInputRef.current) fileInputRef.current.value = "";
             return;
        }

        if (droppedFile.size > maxSize) {
            alert("❌ File size exceeds the 5MB limit.");
             setFile(null);
             setFileName("");
             if (fileInputRef.current) fileInputRef.current.value = "";
             return;
        }

      setFile(droppedFile);
      setFileName(droppedFile.name);
       if (fileInputRef.current) { // Optional: sync with file input
         fileInputRef.current.files = e.dataTransfer.files;
       }
    } else {
      setFile(null);
      setFileName("");
    }
  };


  // --- (extractMedicinesFromImage - Updated for specific fields and format) ---
   const extractMedicinesFromImage = async (base64Image: string): Promise<{ medicines: ExtractedMedicine[], hospitalName?: string }> => {
       // WARNING: Exposing API keys client-side is a security risk.
       // Use environment variables or a backend function.
       const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY; // Example for Next.js
        if (!apiKey) {
            console.error("Gemini API key is not set.");
            // Don't alert here, handle it in handleSubmit
            return { medicines: [] };
        }

       const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

       const prompt = `Extract the following information from this medical prescription image and return a valid JSON array:

1. Hospital/Clinic Information:
   - Look for clinic/hospital name in the letterhead or header
   - Return as "hospitalName" field

2. Medicine Details (for each medicine):
   - "medicineName": Look for medicine names, typically capitalized or at start of each line
   - "dosage": Extract any mg, ml, or other measurement units next to medicine name
   - "frequency": Standardize frequency as follows:
     * "1-0-1" or "BD" → "twice daily"
     * "1-1-1" or "TID" → "thrice daily"
     * "1-0-0" or "OD" → "once daily"
     * "1-0-1-1" or "QID" → "four times daily"
   - "duration": Extract only the numeric value from duration (e.g., from "for 10 days" extract just "10")
   - "prescribedDate": Extract the actual prescription date or bill date from the image (in YYYY-MM-DD format)

Return a JSON array where each object represents one medicine with these fields. For example:
[{
  "hospitalName": "City Hospital",
  "prescriptionDate": "2024-03-15",
  "medicineName": "Amoxicillin",
  "dosage": "500mg",
  "frequency": "twice daily",
  "duration": 7
}]

Ensure to:
- Return numeric values (no text) for duration
- Standardize frequency phrases
- Include hospital name and date at root level of each object
- Return empty array if no clear information found`;


       try {
           const res = await fetch(url, {
               method: "POST",
               body: JSON.stringify({
                   contents: [
                       {
                           parts: [
                               { text: prompt },
                               {
                                   inlineData: {
                                       mimeType: file?.type || "image/jpeg", // Use file type or default
                                       data: base64Image,
                                   },
                               },
                           ],
                       },
                   ],
               }),
               headers: { "Content-Type": "application/json" },
           });

           if (!res.ok) {
               const errorText = await res.text();
               console.error("Gemini API Error Response:", errorText);
               // Throw an error to be caught in handleSubmit
               throw new Error(`Gemini API request failed with status ${res.status}: ${errorText}`);
           }

           const data = await res.json();
            // Access the text content safely
           const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
           console.log("Raw Gemini Response Text:", text);

           let parsed: any = [];
           try {
               // Attempt to parse the text directly as JSON
               parsed = JSON.parse(text);
               if (!Array.isArray(parsed)) {
                   console.warn("Gemini response was not a JSON array, attempting regex fallback.");
                   parsed = []; // Reset parsed if not an array
               }
           } catch (e) {
               console.warn("Direct JSON parsing failed, attempting regex fallback for markdown.", e);
               // Attempt to extract JSON from markdown format (```json ... ```)
               const match = text.match(/```json\s*(\[[\s\S]*?\])\s*```|(\[[\s\S]*?\])/);
               if (match) {
                   const jsonString = match[1] || match[2]; // Use the first captured group that is not null
                   if (jsonString) {
                       try {
                           parsed = JSON.parse(jsonString);
                            if (!Array.isArray(parsed)) {
                                parsed = []; // Reset if regex result is not an array
                            }
                           console.log("Parsed medicines (regex fallback):", parsed);
                       } catch (parseError) {
                           console.error("Failed to parse extracted JSON from regex:", parseError);
                           parsed = []; // Ensure parsed is an empty array on error
                       }
                   } else {
                       console.warn("Regex found markdown but no JSON string inside.");
                       parsed = [];
                   }
               } else {
                   console.warn("Could not find JSON array pattern in Gemini response.");
                   parsed = [];
               }
           }

           // Post-processing: Ensure duration is a number if possible
            const processedMedicines: ExtractedMedicine[] = parsed.map((med: any) => {
                let duration: number | string | null = med.duration;
                if (typeof duration === 'string') {
                    // Try to extract number from duration string
                    const numMatch = duration.match(/\d+/);
                    if (numMatch && numMatch[0]) {
                        duration = parseInt(numMatch[0], 10);
                        if (isNaN(duration)) {
                            duration = med.duration; // Fallback to original string if parsing fails
                        }
                    } else {
                         // If no number found, keep original string or set null if empty
                         duration = duration.trim() === '' ? null : duration;
                    }
                } else if (typeof duration !== 'number' && duration !== null) {
                     // Handle cases where duration might be other unexpected types
                     duration = null;
                }


                // Basic frequency standardization (can be expanded)
                let frequency = med.frequency;
                 if (typeof frequency === 'string') {
                     const lowerFreq = frequency.toLowerCase().trim();
                     if (lowerFreq === 'od' || lowerFreq === 'once daily') {
                         frequency = 'once daily';
                     } else if (lowerFreq === 'bd' || lowerFreq === 'twice daily' || lowerFreq === '1-0-1') {
                         frequency = 'twice daily';
                     } else if (lowerFreq === 'tid' || lowerFreq === 'thrice daily' || lowerFreq === '1-1-1') {
                         frequency = 'thrice daily';
                     }
                     // Add more mappings as needed (e.g., QID, specific times)
                 }


                return {
                    medicineName: med.medicineName || med['Drug Name'] || 'N/A', // Use common keys or N/A
                    dosage: med.dosage || med['Dose'] || null, // Use common keys or null
                    frequency: frequency || med['Frequency'] || null, // Use common keys or null after standardization attempt
                    duration: duration, // Use processed duration
                    prescribedDate: med.prescribedDate || null // Include extracted date
                    // Add other fields if the prompt requests them and they are in the parsed data
                    // e.g., date: med.prescriptionDate, hospital: med.hospitalName
                };
            });

           let extractedHospitalName = '';
           // Extract hospital name from first medicine entry if available
           if (parsed.length > 0 && parsed[0].hospitalName) {
             extractedHospitalName = parsed[0].hospitalName;
           }

           console.log("Processed extracted medicines:", processedMedicines);
           return {
             medicines: processedMedicines,
             hospitalName: extractedHospitalName ?? undefined
           };

       } catch (error: any) {
           console.error("Error calling Gemini API or processing response:", error);
           // Re-throw the error to be caught in handleSubmit for user feedback
           throw error;
       }
   };


  const handleSubmit = async () => {
    if (!user?.uid) {
      alert("Please log in to upload prescriptions.");
      return;
    }

    // Use the string states for validation
    if (!doctorName.trim() || !prescriptionDateString.trim() || !file || !userUid) {
      let missingFields = [];
      if (!doctorName.trim()) missingFields.push("Doctor's Name");
      if (!prescriptionDateString.trim()) missingFields.push("Date");
      if (!file) missingFields.push("File");
      if (!userUid) missingFields.push("User not logged in");
      alert(`⚠️ Please fill all required fields: ${missingFields.join(", ")}.`);
      return; // Stop submission if validation fails
    }

    // Remove MetaMask check since we're using server wallet
    setIsUploading(true);
    setIsExtracting(true);

    try {
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const base64String = (reader.result as string).split(",")[1];
                // 2. Extract medicine data
                const { medicines, hospitalName: extractedHospitalName } = await extractMedicinesFromImage(base64String);

                // 3. Create prescription data object
                const prescriptionData = {
                    doctorName: doctorName.trim(),
                    date: prescriptionDateString,
                    medicines: medicines,
                    hospitalName: extractedHospitalName || hospitalName.trim()
                };

                // Pass userId for ownership verification
                try {
                    const prescriptionHash = createPrescriptionHash(prescriptionData);
                    const idToken = await user.getIdToken();

                    const response = await fetch('/api/blockchain/verify', {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                      },
                      body: JSON.stringify({ 
                        hash: prescriptionHash
                      })
                    });

                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.error || 'Failed to verify prescription');
                    }

                    const { exists, message } = await response.json();
                    if (exists) {
                      alert(message || "This prescription has already been registered in the system.");
                      return;
                    }

                    // Continue with upload if prescription is unique
                    const storageRef = ref(storage, `prescriptions/${userUid}/${Date.now()}-${file.name}`);
                    await uploadBytes(storageRef, file);
                    const fileURL = await getDownloadURL(storageRef);

                    // Register using server wallet
                    await registerPrescription(prescriptionHash);

                    // Save hash to prescriptionHashes collection first
                    await addDoc(collection(db, "prescriptionHashes"), {
                      hash: prescriptionHash,
                      createdAt: Timestamp.now(),
                      userId: userUid // Optional: store who first uploaded it
                    });

                    // Then save prescription details
                    await addDoc(collection(db, "prescriptions"), {
                      uid: userUid,
                      doctorName: doctorName.trim(),
                      date: Timestamp.fromDate(new Date(prescriptionDateString)), // Form date as backup
                      prescribedDate: medicines[0]?.prescribedDate || null, // Store extracted date
                      hospitalName: extractedHospitalName || hospitalName.trim(),
                      fileURL: fileURL,
                      notes: notes.trim(),
                      medicines: medicines,
                      prescriptionHash: prescriptionHash,
                      createdAt: Timestamp.now(),
                      blockchainVerified: true
                    });

                    resetForm();
                    alert("✅ Prescription uploaded and verified successfully!");
                } catch (error: any) {
                    alert(error.message);
                    return;
                }
            } catch (error) {
                console.error("Error processing prescription:", error);
                alert("❌ Error processing prescription. Please try again.");
            } finally {
                setIsUploading(false); // Stop uploading indicator
                setIsExtracting(false); // Stop extraction indicator
            }
        };
        reader.onerror = (error) => {
            console.error("Error reading file:", error);
            alert("❌ Failed to read the uploaded file.");
            setIsUploading(false);
            setIsExtracting(false);
        };
        reader.readAsDataURL(file); // Start reading the file

    } catch (error) {
        console.error("Upload error:", error);
        alert("❌ Failed to upload prescription file.");
        setIsUploading(false);
        setIsExtracting(false);
    }
  };


  const resetForm = () => {
    setDoctorName("");
    setPrescriptionDateString(""); // Reset the string state
    setHospitalName(""); // Reset hospital name
    setFile(null);
    setFileName("");
    setNotes("");
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
  };

  // Add a helper function to calculate remaining days using prescribed date
  const calculateRemainingDays = (prescription: any): number => {
    try {
      // Get the medicine and its prescribed date
      const firstMedicine = prescription.medicines?.[0];
      if (!firstMedicine) return 0;

      // Get the prescribed date with priority:
      // 1. Individual medicine prescribed date
      // 2. Prescription level prescribed date
      // 3. Form submission date
      let startDate: Date | null = null;
      
      if (firstMedicine.prescribedDate) {
        startDate = typeof firstMedicine.prescribedDate === 'string' 
          ? parseISO(firstMedicine.prescribedDate)
          : firstMedicine.prescribedDate;
      } else if (prescription.prescribedDate) {
        startDate = typeof prescription.prescribedDate === 'string'
          ? parseISO(prescription.prescribedDate)
          : prescription.prescribedDate;
      } else if (prescription.date instanceof Timestamp) {
        startDate = prescription.date.toDate();
      }

      if (!startDate || !isValid(startDate)) {
        console.warn('No valid date found for prescription');
        return 0;
      }

      // Get duration from the medicine
      const duration = typeof firstMedicine.duration === 'number' 
        ? firstMedicine.duration 
        : typeof firstMedicine.duration === 'string'
          ? parseInt(firstMedicine.duration)
          : 0;

      if (!duration) return 0;

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const remainingDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return remainingDays > 0 ? remainingDays : 0;
    } catch (error) {
      console.error("Error calculating remaining days:", error);
      return 0;
    }
  };

  // Add verification check when displaying prescriptions
  const verifyPrescriptionIntegrity = async (prescription: any) => {
    const prescriptionHash = createPrescriptionHash({
        doctorName: prescription.doctorName,
        date: prescription.date,
        medicines: prescription.medicines,
        hospitalName: prescription.hospitalName
    });
    
    // Verify against stored hash on blockchain
    const isValid = await verifyPrescriptionUniqueness(prescriptionHash);
    return isValid;
  };

  // Show loading state for initial auth check and data fetch
  if (isLoading || fetchingBills) {
     return <div className="flex justify-center items-center h-screen text-xl font-semibold text-gray-600">Loading...</div>;
  }


  return (
    <div className="mypres-page-container bg-gray-50 min-h-screen py-8 px-4 md:px-8">
      <header className="mb-6 md:mb-10 border-b border-gray-200 pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 leading-tight">My Prescriptions</h1>
        <p className="text-gray-600 mt-2 text-base md:text-lg">
          Securely upload and manage your medical prescriptions. Our AI helps you extract key details effortlessly.
        </p>
      </header>

      {/* Authentication Required Message */}
      {!user && ( // Show if no user is logged in
          <div className="text-center py-16 bg-white rounded-xl shadow-md max-w-2xl mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-red-400 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6.364-3.636l-1.414-1.414a9 9 0 1015.556 0L16.364 13.364A7 7 0 0012 15zm0 0a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">Authentication Required</h2>
              <p className="text-gray-600 text-lg">Please log in to upload or view your prescriptions.</p>
              <p className="text-sm text-gray-500 mt-2">Protecting your health data starts with secure access.</p>
              {/* Add a login button or link here if applicable */}
              {/* <button className="mt-6 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out shadow-md">
                  Go to Login
              </button> */}
          </div>
      )}


      {/* Upload Section (Show only if user is logged in) */}
      {user && (
        <section className="upload-section bg-white p-6 md:p-8 rounded-xl shadow-lg mb-10">
          <h2 className="text-2xl font-bold text-gray-700 mb-6">Upload New Prescription</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left Column: Form Fields */}
            <div className="space-y-6">
              <div>
                <label htmlFor="doctorName" className="block text-sm font-medium text-gray-700 mb-1">
                  Doctor's Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="doctorName"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g., Dr. Emily Carter"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
               <div>
                <label htmlFor="hospitalName" className="block text-sm font-medium text-gray-700 mb-1">
                  Hospital / Clinic Name
                </label>
                <input
                  type="text"
                  id="hospitalName"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="e.g., City General Hospital"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label htmlFor="prescriptionDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Prescription Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="prescriptionDate"
                  value={prescriptionDateString}
                  onChange={(e) => setPrescriptionDateString(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
               <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Follow up in 2 weeks, Feeling much better"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 resize-none"
                />
              </div>
            </div>

            {/* Right Column: File Upload */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div
                onDragOver={handleDragOver}
                 onDragLeave={handleDragLeave} // Added drag leave handler
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 md:h-56 border-2 border-dashed border-gray-300 rounded-lg flex flex-col justify-center items-center text-center p-4 cursor-pointer hover:border-teal-600 transition-colors bg-gray-50"
              >
                <input
                  type="file"
                  id="prescriptionFileUpload" // Changed ID for clarity
                  ref={fileInputRef}
                  accept="image/*,.pdf" // Allow images and PDFs
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div className="text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mt-2 text-sm font-medium text-gray-800">{fileName}</p>
                    <p className="text-xs text-gray-500">Click or drag to change file</p>
                  </div>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mt-3 text-sm text-gray-600">Drag and drop your file here, or</p>
                    <span className="mt-1 text-sm text-teal-600 font-semibold hover:text-teal-700 cursor-pointer transition-colors">
                      Browse Files
                    </span>
                     <p className="mt-2 text-xs text-gray-500">(JPG, PNG, PDF up to 5MB recommended)</p>
                  </>
                )}
              </div>
               {file && ( // Show remove button if file is selected
                   <button
                       onClick={() => { setFile(null); setFileName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                       className="text-xs text-red-600 hover:text-red-800 font-medium"
                   >
                       Remove File
                   </button>
               )}
            </div>
          </div>

          {/* Upload Button and AI Note */}
          <div className="mt-8 text-center">
            <button
              onClick={handleSubmit}
              disabled={!file || !doctorName.trim() || !prescriptionDateString.trim() || isUploading || isExtracting} // Disable if uploading or extracting
              className={`px-8 py-3 font-bold rounded-lg transition duration-300 ease-in-out shadow-md flex items-center justify-center
                ${!file || !doctorName.trim() || !prescriptionDateString.trim() || isUploading || isExtracting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
                }`}
            >
              {(isUploading || isExtracting) ? ( // Show spinner if uploading or extracting
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l2-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {(isUploading || isExtracting) ? "Processing..." : "Upload Prescription"} {/* Change button text based on state */}
            </button>
            <p className="mt-4 text-sm text-gray-600">
              <span className="font-semibold text-teal-700">Powered by AI:</span> Medication details will be automatically extracted.
            </p>
          </div>
        </section>
      )}

      {/* Saved Prescriptions Section */}
      <section className="extracted-info-section mt-10">
        <h2 className="text-2xl font-bold text-gray-700 mb-6 border-b border-gray-200 pb-3">My Saved Prescriptions</h2>
        {user && prescriptions.length === 0 && !fetchingBills && ( // Show if user is logged in, no prescriptions, and not fetching
          <div className="text-center py-10 bg-white rounded-xl shadow-md max-w-2xl mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-xl font-medium text-gray-700">No prescriptions uploaded yet.</p>
            <p className="text-md text-gray-500 mt-2">Start by uploading your first medical document above to see it appear here.</p>
          </div>
        )}

        {user && prescriptions.length > 0 && ( // Show list only if user is logged in and has prescriptions
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className="bg-white shadow-lg rounded-xl p-6 flex flex-col border border-gray-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-teal-800 leading-tight">{prescription.doctorName || 'Unknown Doctor'}</h3>
                   {/* Display Hospital Name if available */}
                   {prescription.hospitalName && (
                       <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full font-medium ml-2">
                           {prescription.hospitalName}
                       </span>
                   )}
                </div>
                 {/* Display Prescription Date */}
                 <div className="text-sm text-gray-600 mb-4">
                   {prescription.prescribedDate ? (
                     <>Date: {format(parseISO(prescription.prescribedDate), 'dd/MM/yyyy')}</>
                   ) : prescription.date ? (
                     <>Date: {format(new Date(prescription.date.seconds * 1000), 'dd/MM/yyyy')}</>
                   ) : (
                     'Date: N/A'
                   )}
                 </div>


                {prescription.notes && (
                  <p className="text-sm text-gray-700 mb-4 italic">
                    &ldquo;{prescription.notes}&rdquo;
                  </p>
                )}

                {/* View Document Link */}
                <div className="border-b border-gray-100 mb-4 pb-4">
                    <a
                      href={prescription.fileURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline font-medium flex items-center"
                      title="View Original Document"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4m-4-4l6 6m0 0V14m0 2h-2" />
                      </svg>
                      View Document
                    </a>
                </div>


                {/* Extracted Medicines List */}
                <div className="flex-grow">
                  <p className="text-base font-semibold text-gray-700 mb-2">Extracted Medicines:</p>
                  <ul className="text-sm text-gray-700 space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                    {prescription.medicines?.map((med: ExtractedMedicine, idx: number) => {
                      // Calculate remaining days using the medicine's own prescribed date
                      const prescribedDate = med.prescribedDate 
                        ? parseISO(med.prescribedDate)
                        : prescription.prescribedDate
                          ? parseISO(prescription.prescribedDate)
                          : prescription.date instanceof Timestamp
                            ? prescription.date.toDate()
                            : null;

                      const duration = typeof med.duration === 'number'
                        ? med.duration
                        : typeof med.duration === 'string'
                          ? parseInt(med.duration)
                          : 0;

                      const remainingDays = prescribedDate && duration
                        ? calculateRemainingDays({
                            medicines: [{ ...med, prescribedDate }],
                            prescribedDate: prescribedDate.toISOString(),
                            date: prescription.date
                          })
                        : 0;

                      const isActive = remainingDays > 0;

                      return (
                        <li key={idx} className="border-b border-gray-100 pb-2 last:border-b-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p><span className="font-medium">{med.medicineName}</span></p>
                              {med.dosage && <p className="text-xs text-gray-600">Dosage: {med.dosage}</p>}
                              {(med.frequency || med.duration) && (
                                <p className="text-xs text-gray-600">
                                  {med.frequency && `Frequency: ${med.frequency}`}
                                  {med.frequency && med.duration && ` - `}
                                  {med.duration && `Duration: ${med.duration} days`}
                                </p>
                              )}
                              {med.prescribedDate && (
                                <p className="text-xs text-gray-600">
                                  Prescribed: {new Date(med.prescribedDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                              {isActive ? `${remainingDays} days left` : 'Completed'}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                {prescription.medicines && prescription.medicines.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No medicine details were automatically extracted from this document.</p>
                )}

                {/* Add to Medications Button (Placeholder) */}
                <button
                  // onClick={() => handleAddToMedications(prescription.medicines)}
                  disabled={!prescription.medicines || prescription.medicines.length === 0}
                  className={`mt-6 px-4 py-2 border border-teal-600 text-teal-600 rounded-md font-semibold hover:bg-teal-50 transition-colors duration-200 flex items-center justify-center ${(!prescription.medicines || prescription.medicines.length === 0) && 'opacity-50 cursor-not-allowed'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Add to Medications
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default MyPrescriptionPage;