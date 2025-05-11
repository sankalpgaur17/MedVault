"use client";

import { useState, useEffect, useRef } from "react";
import { UploadCloud, Plus, Download, Eye } from "lucide-react"; // Added Download and Eye icons
import { db, storage } from "@/lib/firebase";
import {
  collection,
  addDoc,
  Timestamp,
  getDocs,
  query,
  orderBy,
  where,
  onSnapshot, // Added onSnapshot for real-time updates like MyPrescriptionPage
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button"; // Assuming Button is from shadcn/ui
import { getAuth, onAuthStateChanged, User, Unsubscribe } from "firebase/auth"; // Import User and Unsubscribe types
import { format } from 'date-fns'; // Import format for date display

export default function BillsPage() {
  // Use a more specific type for bills if possible, or keep any[]
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false); // For add bill button loading state
  const [fetchingBills, setFetchingBills] = useState(true); // Loading state for fetching bills
  const [newBill, setNewBill] = useState({
    title: "",
    hospital: "",
    amount: "",
    date: "", // Storing date string from input
    file: null as File | null,
  });
  const [user, setUser] = useState<User | null>(null); // Use User type for user state

  const unsubscribeSnapshotRef = useRef<Unsubscribe | null>(null); // Ref for Firestore snapshot listener unsubscribe
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  // --- Effect for Auth State and Initial Fetch ---
  useEffect(() => {
    setFetchingBills(true); // Set loading state initially
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser); // Set the user state
      if (currentUser) {
        // If user is logged in, set up real-time listener
        const billsRef = collection(db, "bills");
        const q = query(
          billsRef,
          where("uid", "==", currentUser.uid),
          orderBy("timestamp", "desc") // Order by timestamp descending
        );

        // Set up the real-time listener
        unsubscribeSnapshotRef.current = onSnapshot(q, (snapshot) => {
          const billList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            // Date is likely stored as a string "YYYY-MM-DD" from the input
            // If it were a Timestamp, you'd convert it here:
            // date: doc.data().date?.toDate().toISOString().split('T')[0] || '',
          }));
          setBills(billList);
          setFetchingBills(false); // Stop loading after initial data is received
        }, (error) => {
          console.error("Error in Firestore snapshot listener:", error);
          setBills([]);
          setFetchingBills(false); // Stop loading on error
        });

      } else {
        // If user logs out, clear bills and unsubscribe
        setUser(null);
        setBills([]);
        if (unsubscribeSnapshotRef.current) {
          unsubscribeSnapshotRef.current();
          unsubscribeSnapshotRef.current = null;
        }
        setFetchingBills(false); // Stop loading if no user
      }
    });

    // Cleanup function: unsubscribe from both auth and Firestore listeners
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshotRef.current) {
        unsubscribeSnapshotRef.current();
        unsubscribeSnapshotRef.current = null;
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount

  // Function to handle changes in input fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewBill((prev) => ({ ...prev, [name]: value }));
  };

  // Function to handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setNewBill((prev) => ({ ...prev, file }));
    if (file) {
        // You might want to display the file name here
        // setFileName(file.name); // If you add a fileName state
    }
  };

    // Function to handle drag over event for file upload
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Necessary to allow dropping
        e.currentTarget.classList.add('border-blue-500', 'bg-blue-100'); // Optional: add drag-over styles
    };

    // Function to handle drag leave event for file upload
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('border-blue-500', 'bg-blue-100'); // Optional: remove drag-over styles
    };

    // Function to handle drop event for file upload
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.classList.remove('border-blue-500', 'bg-blue-100'); // Optional: remove drag-over styles
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setNewBill((prev) => ({ ...prev, file: e.dataTransfer.files[0] }));
             if (fileInputRef.current) { // Optional: sync with file input
               fileInputRef.current.files = e.dataTransfer.files;
             }
        } else {
            setNewBill((prev) => ({ ...prev, file: null }));
        }
    };


  // Function to handle adding a new bill
  const handleAddBill = async () => {
    // Check if user is logged in
    if (!user) {
      alert("Please log in to add bills.");
      return;
    }

    const { title, hospital, amount, date, file } = newBill;
    // Basic validation: title, amount, and file are required
    if (!title.trim() || !amount.trim() || !file) {
      alert("Please fill in all required fields (Title, Amount) and upload a file.");
      return;
    }

    setLoading(true); // Start loading for the add bill button

    try {
      // Upload the file to Firebase Storage
      const fileRef = ref(storage, `bills/${user.uid}/${Date.now()}-${file.name}`); // Organize by user UID
      await uploadBytes(fileRef, file);
      const fileURL = await getDownloadURL(fileRef); // Get the public URL of the uploaded file

      // Prepare bill data to save to Firestore
      const billData = {
        title: title.trim(), // Trim whitespace
        hospital: hospital.trim(), // Trim whitespace
        amount: amount.trim(), // Trim whitespace
        date: date, // Store the date string as is (assumingYYYY-MM-DD from input type="date")
        fileURL: fileURL, // Store the download URL
        timestamp: Timestamp.now(), // Add a server timestamp for ordering
        uid: user.uid, // Store the user's UID
      };

      // Add the bill data to the 'bills' collection in Firestore
      await addDoc(collection(db, "bills"), billData); // onSnapshot will update the state

      // Clear the form fields after successful submission
      setNewBill({
        title: "",
        hospital: "",
        amount: "",
        date: "",
        file: null,
      });
       if (fileInputRef.current) { // Reset file input element
         fileInputRef.current.value = "";
       }


      alert("✅ Bill added successfully!"); // Success feedback

    } catch (err) {
      console.error("Error adding bill:", err);
      alert("❌ Failed to add bill. Please try again."); // Error feedback
    }

    setLoading(false); // Stop loading for the add bill button
  };

  // Function to determine file icon based on file type (simple check)
  const getFileIcon = (fileURL: string) => {
      // Extract file name from URL (simplified)
      const fileName = fileURL.split('/').pop()?.split('?')[0] || '';
      const extension = fileName.split('.').pop()?.toLowerCase();
      if (extension === 'pdf') {
          // Simple SVG for PDF icon
          return (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 2H16C17.1046 2 18 2.89543 18 4V20C18 21.1046 17.1046 22 16 22H8C6.89543 22 6 21.1046 6 20V4C6 2.89543 6.89543 2 8 2ZM8 4V20H16V4H8Z"></path><path d="M10 9H14V11H10V9Z"></path><path d="M10 13H14V15H10V13Z"></path><path d="M10 17H14V19H10V17Z"></path>
              </svg>
          );
      }
      // Simple SVG for a generic file/image icon
      return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"></path>
          </svg>
      );
  };


  return (
    // Main container with padding, but no max width or auto margins for full width
    <main className="p-6 md:p-8"> {/* Increased padding on medium screens */}
      {/* Header Section */}
      <header className="mb-6 md:mb-10 border-b border-gray-200 pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 leading-tight">Medical Bills</h1>
        <p className="text-gray-600 mt-2 text-base md:text-lg">
          Securely upload and manage your medical bills.
        </p>
      </header>

      {/* Authentication Required Message */}
      {!user && !fetchingBills && ( // Show if no user and not currently fetching (initial load)
          <div className="text-center py-16 bg-white rounded-xl shadow-md max-w-2xl mx-auto"> {/* Kept centered for this message */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-red-400 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6.364-3.636l-1.414-1.414a9 9 0 1015.556 0L16.364 13.364A7 7 0 0012 15zm0 0a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">Authentication Required</h2>
              <p className="text-gray-600 text-lg">Please log in to upload or view your medical bills.</p>
              <p className="text-sm text-gray-500 mt-2">Protecting your financial health data starts with secure access.</p>
              {/* Add a login button or link here if applicable */}
              {/* <button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out shadow-md">
                  Go to Login
              </button> */}
          </div>
      )}


      {/* Upload New Medical Bill Section (Show only if user is logged in) */}
      {user && (
        <section className="upload-section bg-white p-6 md:p-8 rounded-xl shadow-lg mb-10">
          <h2 className="text-2xl font-bold text-gray-700 mb-6">Upload New Medical Bill</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start"> {/* Increased gap */}
            {/* Left Column: Form Fields */}
            <div className="space-y-6"> {/* Increased space */}
              <div>
                <label htmlFor="billTitle" className="block text-sm font-medium text-gray-700 mb-1">
                  Bill Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="billTitle"
                  name="title" // Ensure name matches state key
                  value={newBill.title}
                  onChange={handleInputChange}
                  placeholder="Enter bill title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="hospital" className="block text-sm font-medium text-gray-700 mb-1">
                  Hospital / Clinic
                </label>
                <input
                  type="text"
                  id="hospital"
                  name="hospital" // Ensure name matches state key
                  value={newBill.hospital}
                  onChange={handleInputChange}
                  placeholder="Enter hospital or clinic name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
               <div>
                <label htmlFor="billDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  id="billDate"
                  name="date" // Ensure name matches state key
                  value={newBill.date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
               <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount" // Ensure name matches state key
                  value={newBill.amount}
                  onChange={handleInputChange}
                  placeholder="Amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full h-48 md:h-56 border-2 border-dashed border-gray-300 rounded-lg flex flex-col justify-center items-center text-center p-4 cursor-pointer hover:border-blue-600 transition-colors bg-gray-50" // Adjusted hover color
              >
                <input
                  type="file"
                  id="billFileUpload"
                  ref={fileInputRef} // Attach ref
                  accept="image/*,.pdf" // Allow images and PDFs
                  onChange={handleFileChange}
                  className="hidden" // Hide the default input
                />
                {newBill.file ? ( // Check newBill.file instead of fileName state
                  <div className="text-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mt-2 text-sm font-medium text-gray-800">{newBill.file.name}</p>
                    <p className="text-xs text-gray-500">Click or drag to change file</p>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-12 h-12 mx-auto text-gray-400" /> {/* Used lucide icon */}
                    <p className="mt-3 text-sm text-gray-600">Drag and drop your file here, or</p>
                    <span className="mt-1 text-sm text-blue-600 font-semibold hover:text-blue-700 cursor-pointer transition-colors"> {/* Adjusted color */}
                      Browse Files
                    </span>
                     <p className="mt-2 text-xs text-gray-500">(JPG, PNG, PDF up to 10MB)</p> {/* Updated file size */}
                  </>
                )}
              </div>
               {newBill.file && ( // Show remove button if file is selected
                   <button
                       onClick={() => { setNewBill(prev => ({ ...prev, file: null })); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                       className="text-xs text-red-600 hover:text-red-800 font-medium"
                   >
                       Remove File
                   </button>
               )}
            </div>
          </div>

          {/* Upload Button */}
          <div className="flex justify-center mt-8">
            <button
              onClick={handleAddBill}
              disabled={loading || !user || !newBill.title.trim() || !newBill.amount.trim() || !newBill.file}
              className={`px-8 py-3 font-semibold rounded-lg transition duration-300 ease-in-out shadow-md flex items-center justify-center
                ${loading || !user || !newBill.title.trim() || !newBill.amount.trim() || !newBill.file
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
                }`}
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l2-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
              {loading ? "Uploading..." : "Upload Bill"}
            </button>
          </div>
        </section>
      )}


      {/* Your Medical Bills List Section */}
      <section className="bills-list-section bg-white p-6 md:p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-gray-700 mb-4 border-b border-gray-200 pb-3">Your Medical Bills</h2>
          <p className="text-sm text-gray-600 mb-6">Track and manage all your medical expenses</p>

          {/* Loading state for fetching bills */}
          {fetchingBills ? (
              <div className="text-center py-10 text-gray-500">Loading bills...</div>
          ) : !user ? (
              // Authentication required message is handled at the top level now
              null
          ) : bills.length === 0 ? (
              // No bills state (Show only if user is logged in and no bills)
              <div className="text-center py-10 bg-gray-50 rounded-md max-w-2xl mx-auto"> {/* Added background */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-xl font-medium text-gray-700">No medical bills uploaded yet.</p>
                  <p className="text-md text-gray-500 mt-2">Add your first bill using the form above.</p>
              </div>
          ) : (
              // List of Bills (Table-like structure)
              <div className="overflow-x-auto"> {/* Added overflow for smaller screens */}
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tl-md"> {/* Added rounded corner */}
                                  Bill
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Hospital/Clinic
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Date
                              </th>
                              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Amount
                              </th>
                              {/* Removed Status column header */}
                              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tr-md"> {/* Added rounded corner */}
                                  Actions
                              </th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {bills.map((bill) => (
                              <tr key={bill.id}>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                                              {/* Use getFileIcon based on file URL */}
                                              {getFileIcon(bill.fileURL)}
                                          </div>
                                          <div className="ml-4">
                                              <div className="text-sm font-medium text-gray-900">{bill.title}</div>
                                              {/* You could add file name here if needed */}
                                              {/* <div className="text-sm text-gray-500">{bill.fileName}</div> */}
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">{bill.hospital}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">
                                          {/* Format date using date-fns */}
                                          {bill.date ? format(new Date(bill.date), 'MMM dd, yyyy') : 'N/A'}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                                      ₹{bill.amount}
                                  </td>
                                  {/* Removed Status column data */}
                                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                      <div className="flex items-center justify-center space-x-4">
                                          {/* View Bill Link/Icon */}
                                          <a
                                              href={bill.fileURL}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                                              title="View Bill"
                                          >
                                              <Eye className="w-5 h-5" /> {/* Eye icon for viewing */}
                                          </a>
                                          {/* Download Bill Link/Icon */}
                                           <a
                                              href={bill.fileURL}
                                              download // Add download attribute to suggest download
                                              className="text-gray-600 hover:text-gray-800 transition-colors duration-200"
                                              title="Download Bill"
                                          >
                                              <Download className="w-5 h-5" /> {/* Download icon */}
                                          </a>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          )}
      </section>
    </main>
  );
}
