"use client";

import React, { ReactNode, useState } from "react";
import Navbar from "@/components/Navbar";
import Dashboard from "./dashboard/page";
import Profile from "./profile/page";
import Appointment from "./appointment/page";
import MyPrescriptions from "./myprescription/page";
import MyMedicines from "./mymedicine/page";
import LabTest from "./labtest/page";
import Bills from "./bills/page";

const HomeLayout = ({ children }: { children: ReactNode }) => {
  const [selectedOption, setSelectedOption] = useState("Dashboard");

  return (
    <main className="min-h-screen flex flex-col">
      <Navbar selectedOption={selectedOption} setSelectedOption={setSelectedOption} />
      <section className="flex-grow p-6">
        {selectedOption === "Dashboard" ? (
          <Dashboard setSelectedOption={setSelectedOption} />
        ) : selectedOption === "Profile" ? (
          <Profile />
        ) : selectedOption === "Appointments" ? (
          <Appointment />
        ) : selectedOption === "My Prescriptions" ? (
          <MyPrescriptions />
        ) : selectedOption === "My Medicines" ? (
          <MyMedicines />
        ) : selectedOption === "Lab Test" ? ( // Changed from "Lab Tests" to "Lab Test"
          <LabTest />
        ) : selectedOption === "Bills" ? (
          <Bills />
        ) : (
          <div>Invalid Option Selected</div>
        )}
      </section>
    </main>
  );
};

export default HomeLayout;