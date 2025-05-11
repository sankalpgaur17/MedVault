"use client";

import React, { useEffect, useState } from "react";
import { format, compareAsc } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, Timestamp } from "firebase/firestore";

interface DashboardProps {
  setSelectedOption: (option: string) => void;
}

// Add interface for medication data
interface MedicationData {
  id: string;
  medicines?: any[];
  createdAt: Timestamp;
  date: Timestamp;
  doctorName: string;
}

// Add helper function to calculate remaining days
const calculateRemainingDays = (startDate: Date, durationInDays: number): number => {
  if (!startDate || !durationInDays) return 0;
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationInDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const remaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return remaining > 0 ? remaining : 0;
};

// Add helper function to calculate status
const calculateMedicineStatus = (prescriptionDate: Date, duration: number) => {
  const endDate = new Date(prescriptionDate);
  endDate.setDate(endDate.getDate() + duration);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const remaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return {
    isActive: remaining > 0,
    daysRemaining: remaining > 0 ? remaining : 0
  };
};

const Dashboard: React.FC<DashboardProps> = ({ setSelectedOption }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [recentData, setRecentData] = useState<{
    appointments: { id: string; [key: string]: any }[];
    medications: { id: string; [key: string]: any }[];
    labTests: { id: string; [key: string]: any }[];
  }>({
    appointments: [],
    medications: [],
    labTests: []
  });
  const [activeMedications, setActiveMedications] = useState<any[]>([]);

  // Add a new state for statistics
  const [stats, setStats] = useState({
    prescriptionCount: 0,
    activeMedicationsCount: 0
  });

  // Add function to calculate statistics
  const calculateStats = (prescriptionsData: any[]) => {
    let activeMeds = 0;

    prescriptionsData.forEach(prescription => {
      if (prescription.medicines && Array.isArray(prescription.medicines)) {
        prescription.medicines.forEach((med: any) => {
          const prescriptionDate = med.extractedDate 
            ? new Date(med.extractedDate)
            : new Date(prescription.date.toDate());
          
          const duration = typeof med.duration === 'number'
            ? med.duration
            : typeof med.duration === 'string'
              ? parseInt(med.duration)
              : 0;

          const { isActive } = calculateMedicineStatus(prescriptionDate, duration);
          if (isActive) {
            activeMeds++;
          }
        });
      }
    });

    setStats({
      prescriptionCount: prescriptionsData.length,
      activeMedicationsCount: activeMeds
    });
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user profile
        const profileRef = doc(db, "profiles", user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setUserData(profileSnap.data());
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch appointments with correct field name matching
        const appointmentsQuery = query(
          collection(db, "appointments"),
          where("userId", "==", user.uid),
          limit(5)
        );
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointments = appointmentsSnapshot.docs
          .map(doc => {
            const data = doc.data() as { id: string; date?: Timestamp; [key: string]: any };
            const { id, ...rest } = data;
            return { id: doc.id, ...rest };
          })
          .filter(appt => appt.date instanceof Timestamp && appt.date.toDate() >= today)
          .sort((a, b) => (a.date?.seconds || 0) - (b.date?.seconds || 0))
          .slice(0, 3);

        // Update medications fetch and filtering
        const medicationsQuery = query(
          collection(db, "prescriptions"),
          where("uid", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const medicationsSnapshot = await getDocs(medicationsQuery);
        const activeMedications: {
          medicineName?: string;
          prescriptionId: string;
          doctorName?: string;
          hospitalName?: string;
          remainingDays: number;
          date: Date;
          frequency?: string;
          [key: string]: any;
        }[] = [];

        medicationsSnapshot.docs.forEach(doc => {
          const prescriptionData = doc.data();
          if (prescriptionData.medicines && Array.isArray(prescriptionData.medicines)) {
            prescriptionData.medicines.forEach(med => {
              const prescriptionDate = med.prescribedDate 
                ? new Date(med.prescribedDate)
                : new Date(prescriptionData.date.toDate());
              
              const duration = typeof med.duration === 'number' 
                ? med.duration 
                : typeof med.duration === 'string'
                  ? parseInt(med.duration)
                  : 0;

              const remainingDays = calculateRemainingDays(prescriptionDate, duration);
              
              if (remainingDays > 0) {
                activeMedications.push({
                  ...med,
                  prescriptionId: doc.id,
                  doctorName: prescriptionData.doctorName,
                  hospitalName: prescriptionData.hospitalName,
                  remainingDays,
                  date: prescriptionDate
                });
              }
            });
          }
        });

        // Sort medications by remaining days
        activeMedications.sort((a, b) => a.remainingDays - b.remainingDays);

        setRecentData(prev => ({
          ...prev,
          medications: activeMedications.slice(0, 3).map(med => ({
            ...med,
            id: med.prescriptionId // Map prescriptionId to id
          }))
        }));

        // Fetch lab tests
        const labTestsQuery = query(
          collection(db, "labTests"),
          where("uid", "==", user.uid),
          limit(3)
        );
        const labTestsSnapshot = await getDocs(labTestsQuery);
        const labTests = labTestsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setRecentData(prev => ({
          ...prev,
          appointments,
          labTests
        }));

        // Calculate statistics
        calculateStats(medicationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Add useEffect for daily status update
  useEffect(() => {
    const updateMedicationStatus = () => {
      fetchActiveMedications();
    };

    // Update status initially
    updateMedicationStatus();

    // Set up daily check at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    // Set timeout for first update at midnight
    const timeout = setTimeout(() => {
      updateMedicationStatus();
      // Then set up daily interval
      const interval = setInterval(updateMedicationStatus, 24 * 60 * 60 * 1000);
      return () => clearInterval(interval);
    }, timeUntilMidnight);

    return () => clearTimeout(timeout);
  }, [user]);

  // Add function to fetch active medications
  const fetchActiveMedications = async () => {
    if (!user) return;

    try {
      const prescriptionsQuery = query(
        collection(db, "prescriptions"),
        where("uid", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(prescriptionsQuery);
      const activeMeds: any[] = [];

      snapshot.forEach((doc) => {
        const prescriptionData = doc.data();
        if (prescriptionData.medicines && Array.isArray(prescriptionData.medicines)) {
          prescriptionData.medicines.forEach((med: any) => {
            const prescriptionDate = med.extractedDate 
              ? new Date(med.extractedDate)
              : new Date(prescriptionData.date.toDate());

            const duration = typeof med.duration === 'number'
              ? med.duration
              : typeof med.duration === 'string'
                ? parseInt(med.duration)
                : 0;

            const { isActive, daysRemaining } = calculateMedicineStatus(prescriptionDate, duration);

            if (isActive) {
              activeMeds.push({
                ...med,
                prescriptionId: doc.id,
                daysRemaining,
                hospitalName: prescriptionData.hospitalName,
                date: prescriptionDate
              });
            }
          });
        }
      });

      // Sort by days remaining (most urgent first)
      activeMeds.sort((a, b) => a.daysRemaining - b.daysRemaining);
      setActiveMedications(activeMeds);
      
      // Update recentData state with active medications
      setRecentData(prev => ({
        ...prev,
        medications: activeMeds.slice(0, 3)
      }));

    } catch (error) {
      console.error("Error fetching active medications:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="text-center py-16 bg-white rounded-xl shadow-md max-w-2xl mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-red-400 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6.364-3.636l-1.414-1.414a9 9 0 1015.556 0L16.364 13.364A7 7 0 0012 15zm0 0a1 1 0 100-2 1 1 0 000 2z" />
          </svg>
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">Authentication Required</h2>
          <p className="text-gray-600 text-lg">Please log in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Welcome Section */}
      <div className="bg-teal-600 text-white p-8 rounded-xl mb-8">
        <h1 className="text-2xl font-semibold mb-2">
          Welcome back, {userData?.name || user?.email?.split('@')[0] || 'Guest'}!
        </h1>
        <p className="text-teal-100">
          Track your medications and never miss a dose. Upload your prescriptions and we'll help you manage your health journey.
        </p>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-teal-500/20 p-4 rounded-lg text-center">
            <h3 className="text-3xl font-bold mb-1">{stats.prescriptionCount}</h3>
            <p className="text-sm">Prescriptions</p>
          </div>
          <div className="bg-teal-500/20 p-4 rounded-lg text-center">
            <h3 className="text-3xl font-bold mb-1">{stats.activeMedicationsCount}</h3>
            <p className="text-sm">Active Medications</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button 
          onClick={() => setSelectedOption("Appointments")}
          className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center space-x-3"
        >
          <div className="bg-blue-100 p-3 rounded-lg">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-medium text-gray-800">Add Appointment</span>
        </button>

        <button 
          onClick={() => setSelectedOption("My Prescriptions")}
          className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center space-x-3"
        >
          <div className="bg-teal-100 p-3 rounded-lg">
            <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="font-medium text-gray-800">Upload Prescription</span>
        </button>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upcoming Appointments */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Upcoming Appointments</h2>
            <button 
              onClick={() => setSelectedOption("Appointments")}
              className="text-sm text-teal-600 hover:text-teal-800"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentData.appointments.length > 0 ? (
              recentData.appointments.map(appointment => (
                <div key={appointment.id} className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-800">{appointment.doctor}</p>
                  <p className="text-sm text-gray-600">{format(appointment.date.toDate(), "MMM d, yyyy")}</p>
                  <p className="text-sm text-gray-600">{appointment.time}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-600 text-sm">No upcoming appointments</p>
            )}
          </div>
        </div>

        {/* Current Medications */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Current Medications</h2>
            <button 
              onClick={() => setSelectedOption("My Medicines")}
              className="text-sm text-teal-600 hover:text-teal-800"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {activeMedications.length > 0 ? (
              activeMedications.slice(0, 3).map((med, index) => (
                <div key={`${med.prescriptionId}-${index}`} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">{med.medicineName}</p>
                      {med.hospitalName && (
                        <p className="text-sm text-gray-600">{med.hospitalName}</p>
                      )}
                      {med.frequency && (
                        <p className="text-sm text-gray-600">{med.frequency}</p>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-sm rounded-full">
                      {med.daysRemaining} days left
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600 text-sm">No active medications</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Lab Tests */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Recent Lab Tests</h2>
            <button 
              onClick={() => setSelectedOption("Lab Test")}
              className="text-sm text-teal-600 hover:text-teal-800"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentData.labTests.length > 0 ? (
              recentData.labTests.map(test => (
                <div key={test.id} className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-800">{test.testName}</p>
                  <p className="text-sm text-gray-600">{test.testType}</p>
                  <p className="text-sm text-gray-600">
                    {format(test.testDate.toDate(), "MMM d, yyyy")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-600 text-sm">No recent lab tests</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
