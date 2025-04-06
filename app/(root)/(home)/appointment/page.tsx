"use client";

import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./calendar.css"; // Ensure the CSS path is correct

interface Appointment {
  id: string;
  date: Date;
  time: string;
  description: string;
}

const AppointmentPage = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [appointmentDescription, setAppointmentDescription] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");

  // Function to handle date selection
  const handleDateChange = (value: Date | Date[] | null) => {
    if (!value) return; // Ensure value is not null
    const selected = Array.isArray(value) ? value[0] : value; // For range selection, pick the first date
    setSelectedDate(selected);
    setAppointmentDescription(""); // Reset description and time when new date is selected
    setAppointmentTime("");
  };

  // Function to handle adding an appointment
  const handleAddAppointment = () => {
    if (selectedDate && appointmentDescription && appointmentTime) {
      const newAppointment: Appointment = {
        id: Date.now().toString(),
        date: selectedDate,
        time: appointmentTime,
        description: appointmentDescription,
      };
      setAppointments((prevAppointments) => [...prevAppointments, newAppointment]);
      setSelectedDate(null); // Reset selected date after adding appointment
      setAppointmentDescription(""); // Reset description
      setAppointmentTime(""); // Reset time
    } else {
      alert("Please fill in all the fields.");
    }
  };

  // Function to check if an appointment exists for a given date
  const hasAppointment = (date: Date) => {
    return appointments.some(
      (appointment) => appointment.date.toDateString() === date.toDateString()
    );
  };

  // Function to get appointment details for a specific date
  const getAppointmentDetails = (date: Date) => {
    const appointment = appointments.find(
      (appointment) => appointment.date.toDateString() === date.toDateString()
    );
    return appointment ? `${appointment.time} - ${appointment.description}` : "";
  };

  return (
    <div className="appointment-page p-6">
      <h1 className="text-3xl font-bold text-center mb-6">Manage Your Appointments</h1>

      {/* Calendar component */}
      <div className="calendar-container mb-6 flex justify-center">
        <Calendar
          onChange={handleDateChange}
          value={selectedDate || new Date()}
          tileClassName={({ date }) => (hasAppointment(date) ? "react-calendar__tile--hasAppointment" : "")}
          tileContent={({ date }) => {
            const appointmentDetails = getAppointmentDetails(date);
            return appointmentDetails ? (
              <div className="appointment-details text-xs text-white bg-black bg-opacity-50 p-1 rounded-md mt-1">
                {appointmentDetails}
              </div>
            ) : null;
          }}
        />
      </div>

      {/* Add Appointment Form */}
      {selectedDate && (
        <div className="appointment-form p-6 bg-gray-100 rounded-lg shadow-md max-w-lg mx-auto">
          <h3 className="text-xl font-semibold mb-4">Schedule Appointment</h3>
          <label htmlFor="time" className="block font-medium">Time:</label>
          <input
            type="time"
            id="time"
            className="border border-gray-300 rounded-md p-2 w-full mt-1"
            value={appointmentTime}
            onChange={(e) => setAppointmentTime(e.target.value)}
          />
          <label htmlFor="description" className="block font-medium mt-4">Description:</label>
          <textarea
            id="description"
            className="border border-gray-300 rounded-md p-2 w-full mt-1"
            value={appointmentDescription}
            onChange={(e) => setAppointmentDescription(e.target.value)}
          />
          <button
            onClick={handleAddAppointment}
            className="mt-4 w-full p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
          >
            Add Appointment
          </button>
        </div>
      )}

      {/* Appointments List */}
      <div className="mt-6 max-w-lg mx-auto">
        <h2 className="text-xl font-semibold mb-4">Your Appointments</h2>
        {appointments.length > 0 ? (
          <div className="appointments-list">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="appointment-item mb-4 p-4 bg-blue-50 rounded-lg shadow-md">
                <p className="font-semibold">{appointment.time} - {appointment.description}</p>
                <p className="text-sm text-gray-500">{appointment.date.toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">No appointments scheduled yet.</p>
        )}
      </div>
    </div>
  );
};

export default AppointmentPage;