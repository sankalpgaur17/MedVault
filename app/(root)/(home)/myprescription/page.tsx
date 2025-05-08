"use client";

import React, { useEffect, useState, useRef } from "react"; // Import useRef
import { db, storage } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  Timestamp, // Import Timestamp if using date fields like createdAt
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, onAuthStateChanged, Unsubscribe } from "firebase/auth"; // Import Unsubscribe type
import "./mypres.css";

interface PrescriptionDocData {
  // Define based on Firestore data structure
  uid: string;
  doctorName: string;
  prescriptionDate: string; // Consider storing as Timestamp for easier sorting/querying
  fileURL: string;
  notes: string;
  medicines?: any[];
  createdAt: Timestamp; // Assuming you store createdAt as a Timestamp
}

interface Prescription extends PrescriptionDocData {
  id: string;
}

const MyPrescriptionPage = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doctorName, setDoctorName] = useState("");
  const [prescriptionDate, setPrescriptionDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [userUid, setUserUid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Optional: Loading state

  // Ref to store the Firestore unsubscribe function
  // Use useRef to persist the function across re-renders without causing effect re-runs
  const unsubscribeSnapshotRef = useRef<Unsubscribe | null>(null);

  // Effect for Authentication State
  useEffect(() => {
    setIsLoading(true); // Start loading when checking auth
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Auth State Change: User logged in - ", user.uid);
        setUserUid(user.uid);
      } else {
        console.log("Auth State Change: User logged out.");
        setUserUid(null);
        setPrescriptions([]); // Clear prescriptions when logged out
         // Ensure any lingering snapshot listener is cleaned up if user logs out
         // This might be redundant if the second useEffect handles it, but safe to keep
         if (unsubscribeSnapshotRef.current) {
             console.log("Auth state null, cleaning up snapshot listener.");
             unsubscribeSnapshotRef.current();
             unsubscribeSnapshotRef.current = null;
         }
      }
      setIsLoading(false); // Finish loading once auth state is determined
    });

    // Cleanup auth listener on component unmount
    return () => {
      console.log("Unmounting Component: Cleaning up Auth listener.");
      unsubscribeAuth();
       // Also clean up snapshot listener on unmount, just in case
       if (unsubscribeSnapshotRef.current) {
           console.log("Unmounting Component: Cleaning up snapshot listener.");
           unsubscribeSnapshotRef.current();
           unsubscribeSnapshotRef.current = null;
       }
    };
  }, []); // Runs only once on mount

  // Effect for Firestore Listener based on User UID
  useEffect(() => {
    // Only run if userUid is known (not null)
    if (userUid) {
      console.log(`Setting up Firestore listener for user: ${userUid}`);
      const q = query(
        collection(db, "prescriptions"),
        where("uid", "==", userUid)
        // orderBy("createdAt", "desc") // Optional: Order by creation date
      );

      // Assign the unsubscribe function to the ref's current value
      unsubscribeSnapshotRef.current = onSnapshot(
        q,
        (snapshot) => {
          console.log("Firestore Snapshot received.");
          const data: Prescription[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Prescription[];
          // Reverse is okay here if you prefer, or use orderBy in the query
          setPrescriptions(data.reverse());
        },
        (error) => {
          // This error handler will now correctly catch issues
          console.error("Error in Firestore snapshot listener:", error);
          // Handle the error appropriately, e.g., show a message to the user
          setPrescriptions([]); // Clear data on error
        }
      );
    } else {
      // If userUid is null (logged out or initially null), ensure no listener is active
      if (unsubscribeSnapshotRef.current) {
        console.log("User UID is null, cleaning up existing snapshot listener.");
        unsubscribeSnapshotRef.current();
        unsubscribeSnapshotRef.current = null;
      }
       setPrescriptions([]); // Ensure prescriptions are cleared if userUid becomes null
    }

    // Cleanup function for *this* effect
    return () => {
      if (unsubscribeSnapshotRef.current) {
        console.log("Cleaning up Firestore listener (Effect dependency changed or unmount).");
        unsubscribeSnapshotRef.current();
        unsubscribeSnapshotRef.current = null; // Clear the ref
      }
    };
  }, [userUid]); // Re-run this effect WHENEVER userUid changes

  // --- Rest of your component code remains largely the same ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const extractMedicinesFromImage = async (base64Image: string) => {
    // WARNING: Exposing API keys directly in client-side code is a major security risk.
    // This key should ideally be used via a backend function (e.g., Cloud Function)
    // For now, ensure this key is properly restricted in Google Cloud Console.
    const apiKey = "AIzaSyA_k9kGr94-NBRnDmZB_VjymyKo1zni2ac"; // Consider moving to environment variables if absolutely necessary client-side
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Extract and return only a valid JSON array containing objects for each medicine found in the image. Each object should have keys: "Sr.", "Drug Name", "Frequency", "Duration", and "Date" if available. If no valid medicines are found, return an empty array []. Do not include any introductory text or markdown formatting like \`\`\`json. Just the raw JSON array.`,
                },
                {
                  inlineData: {
                    mimeType: file?.type || "image/jpeg", // Provide a default mimeType
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
        console.error("Gemini API Error Response:", await res.text());
        throw new Error(`Gemini API request failed with status ${res.status}`);
      }

      const data = await res.json();
      // Improved extraction logic to handle potential API response variations
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      console.log("Raw Gemini Response Text:", text); // Log the raw response text

        // Try to directly parse, assuming the API returns clean JSON
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                console.log("Parsed medicines (direct):", parsed);
                return parsed;
            }
        } catch (e) {
            console.warn("Direct JSON parsing failed, attempting regex fallback.");
            // Fallback to regex if direct parsing fails (e.g., if surrounded by markdown)
             const match = text.match(/(\[[\s\S]*?\])/); // More robust regex
            if (match && match[1]) {
                try {
                    const parsedFallback = JSON.parse(match[1]);
                     console.log("Parsed medicines (regex fallback):", parsedFallback);
                     return parsedFallback;
                } catch (parseError) {
                     console.error("Failed to parse extracted JSON:", parseError);
                     return []; // Return empty array on final failure
                }
            }
        }
      console.warn("Could not extract valid JSON array from Gemini response.");
      return []; // Return empty array if no valid JSON found
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      alert("❌ Failed to extract medicine data from the image.");
      return []; // Return empty array on network or other errors
    }
  };

  const handleSubmit = async () => {
    if (doctorName && prescriptionDate && file && userUid) {
      try {
        // 1. Upload file to Storage
        const storageRef = ref(
          storage,
          `prescriptions/${userUid}/${Date.now()}-${file.name}` // Include userUid in path
        );
        await uploadBytes(storageRef, file);
        const fileURL = await getDownloadURL(storageRef);
        console.log("File uploaded, URL:", fileURL);

        // 2. Read file for Gemini API
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64String = (reader.result as string).split(",")[1];
            console.log("Extracting medicines...");
            const medicines = await extractMedicinesFromImage(base64String);
            console.log("Extracted medicines:", medicines);

            // 3. Add document to Firestore
            console.log("Adding document to Firestore...");
            await addDoc(collection(db, "prescriptions"), {
              uid: userUid,
              doctorName,
              prescriptionDate, // Store as string or convert to Timestamp: Timestamp.fromDate(new Date(prescriptionDate))
              fileURL,
              notes,
              medicines: medicines || [], // Ensure it's an array
              createdAt: Timestamp.now(), // Use Firestore Timestamp
            });

            resetForm();
            alert("✅ Prescription uploaded successfully!");
          } catch (innerError) {
             // Catch errors specifically from medicine extraction or Firestore write
             console.error("Error during medicine extraction or Firestore write:", innerError);
             alert("❌ Failed during data processing or saving.");
          }
        };
        reader.onerror = (error) => {
             console.error("Error reading file:", error);
             alert("❌ Failed to read the uploaded file.");
        }
        reader.readAsDataURL(file);

      } catch (error) {
        console.error("Upload error:", error);
        alert("❌ Failed to upload prescription file.");
      }
    } else {
      let missingFields = [];
      if (!doctorName) missingFields.push("Doctor's Name");
      if (!prescriptionDate) missingFields.push("Date");
      if (!file) missingFields.push("File");
      if (!userUid) missingFields.push("User not logged in"); // Should ideally not happen if button is disabled
      alert(`Please fill all fields: ${missingFields.join(", ")}.`);
    }
  };

  const resetForm = () => {
    setDoctorName("");
    setPrescriptionDate("");
    setFile(null);
    setNotes("");
    // Clear the file input visually if needed (requires a ref or different approach)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  // Display loading indicator
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="my-prescription-page">
      <h1 className="text-2xl font-semibold mb-4">My Prescription</h1>

      {/* Only show form if logged in */}
      {userUid && (
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
                  accept="image/*,.pdf" // Allow PDF too maybe?
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
                  disabled={!file || !doctorName || !prescriptionDate} // Basic validation disable
                  className="bg-blue-600 text-white rounded-md px-4 py-2 mt-4 disabled:bg-gray-400"
              >
                  Upload Prescription
              </button>
          </div>
      )}
      {!userUid && !isLoading && (
          <p className="text-center text-gray-600 mb-4">Please log in to upload or view prescriptions.</p>
      )}


      <div className="uploaded-prescriptions mt-8">
        <h3 className="text-xl font-semibold mb-2">Uploaded Prescriptions</h3>
        {userUid && prescriptions.length === 0 ? (
          <p>No prescriptions uploaded yet.</p>
        ) : !userUid ? (
            <p></p> // Already showing login message above
        ): (
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
                {prescription.notes && ( // Only show if notes exist
                    <p>
                        <strong>Notes:</strong> {prescription.notes}
                    </p>
                )}
                <a
                  href={prescription.fileURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  View Image
                </a>

                {prescription.medicines && prescription.medicines.length > 0 && (
                  <>
                    <p className="mt-2 font-semibold">Medicines:</p>
                    <ul className="list-disc list-inside text-sm">
                      {prescription.medicines.map((med: any, idx: number) => (
                        <li key={idx}>
                          {/* Check if properties exist before accessing */}
                           {med["Sr."] ? `${med["Sr."]}. ` : ""}
                           {med["Drug Name"] || "N/A"}
                           {med["Frequency"] ? ` - ${med["Frequency"]}` : ""}
                           {med["Duration"] ? ` for ${med["Duration"]}` : ""}
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