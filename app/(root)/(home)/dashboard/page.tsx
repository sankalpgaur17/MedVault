import React from "react";

// Helper function to format the date
const getFormattedDate = () => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return new Date().toLocaleDateString(undefined, options); // Adjust locale if needed
};

interface DashboardProps {
  setSelectedOption: (option: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setSelectedOption }) => {
  const currentDate = getFormattedDate();

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Welcome Header */}
      <div className="text-2xl font-semibold mb-4">Welcome Back, [User Name]!</div>
      <p className="text-gray-500 mb-8">Today is {currentDate}</p>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Next Appointment</h3>
          <p className="text-gray-600">Date: [Date & Time]</p>
          <p className="text-gray-500">Doctor: [Doctor's Name or Specialty]</p>
          <button
            className="mt-4 text-blue-500"
            onClick={() => setSelectedOption("Appointments")} // Navigate to Appointments
          >
            View All Appointments
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Prescriptions</h3>
          <p className="text-gray-600">Recent: [Medication Name]</p>
          <p className="text-gray-500">Refill Due Soon</p>
          <button className="mt-4 text-blue-500">Manage Prescriptions</button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Lab Results</h3>
          <p className="text-gray-600">Latest Test: [Test Name]</p>
          <p className="text-gray-500">Status: Ready for Review</p>
          <button className="mt-4 text-blue-500">View Lab Results</button>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="flex flex-wrap gap-4">
        <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
          Book Appointment
        </button>
        <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
          Request Prescription Refill
        </button>
        <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
          Order Lab Test
        </button>
        <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
          Manage Insurance
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
