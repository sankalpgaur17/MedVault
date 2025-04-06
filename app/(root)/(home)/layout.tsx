"use client";

import React, { ReactNode, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/sidebar";
import Dashboard from "./dashboard/page";
import Profile from "./profile/page";
import Appointment from "./appointment/page";
import MyPrescriptions from "./myprescription/page";
import MyMedicines from "./mymedicine/page";

const HomeLayout = ({ children }: { children: ReactNode }) => {
  const [selectedOption, setSelectedOption] = useState("Dashboard");

  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-grow">
        <Sidebar selectedOption={selectedOption} setSelectedOption={setSelectedOption} />
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
          ) : (
            <div>Invalid Option Selected</div> // Handle invalid options explicitly
          )}
        </section>
      </div>
    </main>
  );
};

export default HomeLayout;