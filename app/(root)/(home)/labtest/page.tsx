"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
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
import { v4 as uuidv4 } from "uuid";

// Define interfaces for lab test data
interface LabTest {
  id: string;
  uid: string;
  testName: string;
  testType: string;
  laboratoryName: string;
  testDate: Timestamp;
  reportURL: string;
  results?: TestResult[];
  referringDoctor?: string;
  notes?: string;
  cost?: number;
  createdAt: Timestamp;
}

interface TestResult {
  parameter: string;
  value: string;
  unit?: string;
  normalRange?: string;
  isNormal?: boolean;
}

const testTypes = [
  "Blood Test",
  "Urine Test",
  "X-Ray",
  "MRI",
  "CT Scan",
  "Ultrasound",
  "ECG",
  "Others"
];

const LabTestPage = () => {
  const { user } = useAuth();
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [testName, setTestName] = useState("");
  const [testType, setTestType] = useState("");
  const [laboratoryName, setLaboratoryName] = useState("");
  const [testDateString, setTestDateString] = useState("");
  const [referringDoctor, setReferringDoctor] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  // Fetch lab tests
  useEffect(() => {
    if (!user?.uid) return;

    // Remove orderBy temporarily until index is created
    const q = query(
      collection(db, "labTests"),
      where("uid", "==", user.uid)
      // Will add orderBy back after creating index
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const testData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LabTest[];
      // Sort on client side temporarily
      testData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
      setLabTests(testData);
    });

    return () => unsubscribe();
  }, [user]);

  // File handling functions
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        alert("File size should not exceed 5MB");
        return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleSubmit = async () => {
    if (!user?.uid || !file || !testName || !testType || !testDateString) {
      setMessage("Please fill in all required fields and upload a report.");
      return;
    }

    setIsUploading(true);
    try {
      // Upload file
      const storageRef = ref(storage, `labTests/${user.uid}/${uuidv4()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const reportURL = await getDownloadURL(storageRef);

      // Save to Firestore
      await addDoc(collection(db, "labTests"), {
        uid: user.uid,
        testName: testName.trim(),
        testType,
        laboratoryName: laboratoryName.trim(),
        testDate: Timestamp.fromDate(new Date(testDateString)),
        reportURL,
        referringDoctor: referringDoctor.trim(),
        notes: notes.trim(),
        createdAt: Timestamp.now(),
      });

      // Reset form
      setTestName("");
      setTestType("");
      setLaboratoryName("");
      setTestDateString("");
      setReferringDoctor("");
      setNotes("");
      setFile(null);
      setFileName("");
      setMessage("Lab test report uploaded successfully!");
    } catch (error) {
      console.error("Error uploading report:", error);
      setMessage("Error uploading report. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Add filter function
  const getFilteredTests = () => {
    if (selectedFilter === "all") return labTests;
    return labTests.filter(test => test.testType === selectedFilter);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8">
      {/* Header */}
      <header className="mb-8 border-b border-gray-200 pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">Lab Test Reports</h1>
        <p className="text-gray-600 mt-2">Upload and manage your medical test reports and results.</p>
      </header>

      {/* Upload Section */}
      <section className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-700 mb-6">Upload New Report</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="e.g., Complete Blood Count"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Type <span className="text-red-500">*</span>
              </label>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select Test Type</option>
                {testTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* ...Additional form fields... */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Laboratory Name
              </label>
              <input
                type="text"
                value={laboratoryName}
                onChange={(e) => setLaboratoryName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="e.g., City Medical Laboratory"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={testDateString}
                onChange={(e) => setTestDateString(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Right Column - File Upload and Additional Info */}
          <div className="space-y-4">
            {/* File Upload Area */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-teal-500 transition-colors"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
              />
              {fileName ? (
                <div>
                  <p className="text-teal-600 font-medium">{fileName}</p>
                  <p className="text-sm text-gray-500 mt-2">Click to change file</p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600">Click to upload report</p>
                  <p className="text-sm text-gray-500 mt-2">(PDF, JPG, PNG up to 5MB)</p>
                </div>
              )}
            </div>

            {/* Additional Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referring Doctor
              </label>
              <input
                type="text"
                value={referringDoctor}
                onChange={(e) => setReferringDoctor(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="Doctor's name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                rows={3}
                placeholder="Any additional notes"
              />
            </div>
          </div>
        </div>

        {/* Upload Button */}
        <div className="mt-6 text-right">
          <button
            onClick={handleSubmit}
            disabled={isUploading}
            className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-400"
          >
            {isUploading ? "Uploading..." : "Upload Report"}
          </button>
        </div>

        {message && (
          <div className={`mt-4 p-4 rounded-lg ${
            message.includes("successfully") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {message}
          </div>
        )}
      </section>

      {/* Display Lab Tests */}
      <section className="mt-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-700">My Lab Reports</h2>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Filter by:</label>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
            >
              <option value="all">All Reports</option>
              {testTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getFilteredTests().map((test) => (
            <div key={test.id} className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{test.testName}</h3>
                  <p className="text-sm text-gray-500">{test.testType}</p>
                </div>
                <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">
                  {new Date(test.testDate.seconds * 1000).toLocaleDateString()}
                </span>
              </div>

              {test.laboratoryName && (
                <p className="text-sm text-gray-600 mb-2">
                  Lab: {test.laboratoryName}
                </p>
              )}

              {test.referringDoctor && (
                <p className="text-sm text-gray-600 mb-2">
                  Doctor: {test.referringDoctor}
                </p>
              )}

              {test.cost && (
                <p className="text-sm text-gray-600 mb-4">
                  Cost: ₹{test.cost}
                </p>
              )}

              <div className="mt-4">
                <a
                  href={test.reportURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:text-teal-700 font-medium text-sm inline-flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Report
                </a>
              </div>
            </div>
          ))}
        </div>

        {getFilteredTests().length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-xl font-medium text-gray-700">
              {selectedFilter === "all" 
                ? "No lab reports yet" 
                : `No ${selectedFilter} reports found`}
            </p>
            <p className="text-gray-500 mt-2">
              {selectedFilter === "all"
                ? "Upload your first lab report to see it here"
                : "Try selecting a different filter or upload a new report"}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default LabTestPage;
