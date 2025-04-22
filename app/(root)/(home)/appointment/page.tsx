'use client';

import React, { useState, useEffect } from 'react';
import './calendar.css';
import {
    format,
    startOfMonth,
    endOfMonth,
    isSameDay,
    getMonth,
    getYear,
    subMonths,
    addMonths,
} from 'date-fns';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

interface Appointment {
    id: string;
    date: Date;
    time: string;
    doctor: string;
    speciality: string;
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const AppointmentPage = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [doctor, setDoctor] = useState('');
    const [speciality, setSpeciality] = useState('');
    const [appointmentTime, setAppointmentTime] = useState('');
    const [view, setView] = useState<'month' | 'week'>('month');

    const year = getYear(currentDate);
    const month = getMonth(currentDate);
    const firstDayOfMonth = startOfMonth(currentDate);

    // Get current user UID
    const user = getAuth().currentUser;
    const userId = user ? user.uid : null;

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!userId) return; // If user is not logged in, don't fetch

            const appointmentsRef = collection(db, 'appointments');
            const q = query(appointmentsRef, where('userId', '==', userId));

            const querySnapshot = await getDocs(q);
            const loadedAppointments: Appointment[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                loadedAppointments.push({
                    id: doc.id,
                    date: new Date(data.date),
                    time: data.time,
                    doctor: data.doctor,
                    speciality: data.speciality,
                });
            });

            setAppointments(loadedAppointments);
        };

        fetchAppointments();
    }, [userId]);

    const prevMonth = () => {
        setCurrentDate(subMonths(currentDate, 1));
    };

    const nextMonth = () => {
        setCurrentDate(addMonths(currentDate, 1));
    };

    const today = () => {
        setCurrentDate(new Date());
    };

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
        setIsPopupOpen(true);
        setDoctor('');
        setSpeciality('');
        setAppointmentTime('');
    };

    const closePopup = () => {
        setIsPopupOpen(false);
    };

    const handleAddAppointment = async () => {
        if (!userId) {
            alert('You must be logged in to add an appointment.');
            return;
        }

        if (selectedDate && doctor && speciality && appointmentTime) {
            const newAppointment: Appointment = {
                id: Date.now().toString(),
                date: selectedDate,
                time: appointmentTime,
                doctor,
                speciality,
            };

            // Store the appointment under the user's UID
            await addDoc(collection(db, 'appointments'), {
                userId: userId, // Store UID with appointment
                date: selectedDate.toISOString(),
                time: appointmentTime,
                doctor,
                speciality,
            });

            // Update the state with the new appointment
            setAppointments((prev) => [...prev, newAppointment]);

            closePopup();
        } else {
            alert('Please fill in all the fields.');
        }
    };

    const hasAppointment = (date: Date) => {
        return appointments.some((appt) => isSameDay(appt.date, date));
    };

    const getAppointmentsForDate = (date: Date) => {
        return appointments.filter((appt) => isSameDay(appt.date, date));
    };

    const renderDays = () => {
        const calendarDays = [];
        const firstDay = startOfMonth(currentDate);
        const firstDayOfMonthWeekday = firstDay.getDay();

        let dayCounter = 1 - firstDayOfMonthWeekday;

        for (let i = 0; i < 35; i++) {
            const currentDateForDay = new Date(year, month, dayCounter);
            const isCurrentMonth =
                currentDateForDay.getMonth() === month &&
                currentDateForDay.getFullYear() === year;
            const dateAppointments = isCurrentMonth ? getAppointmentsForDate(currentDateForDay) : [];
            const hasAppt = dateAppointments.length > 0;
            const isToday = isCurrentMonth && isSameDay(currentDateForDay, new Date());
            const isSelected = isCurrentMonth && selectedDate && isSameDay(currentDateForDay, selectedDate);

            calendarDays.push(
                <div
                    key={`day-${currentDateForDay.getTime()}`}
                    className={`day ${hasAppt ? 'has-appointment' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${!isCurrentMonth ? 'dull' : ''}`}
                    onClick={() => isCurrentMonth && handleDayClick(currentDateForDay)}
                >
                    <div className="day-number">{currentDateForDay.getDate()}</div>
                    {hasAppt && (
                        <div className="appointment-details">
                            {dateAppointments.map((appt, index) => (
                                <div key={appt.id} className="appointment-brief">
                                    <span className="appointment-time">{appt.time}</span>
                                    <span className="appointment-doctor">{appt.doctor}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
            dayCounter++;
        }

        return calendarDays;
    };

    return (
        <div className={`custom-appointments-container ${isPopupOpen ? 'dimmed' : ''}`}>
            <h1 className="custom-appointments-title">Appointments</h1>
            <div className="custom-calendar-container">
                <div className="custom-calendar-header">
                    <h2>{format(currentDate, 'MMMM yyyy')}</h2>
                    <div className="custom-calendar-actions">
                        <button onClick={() => setView('week')} className={`view-button ${view === 'week' ? 'active' : ''}`}>Week</button>
                        <button onClick={() => setView('month')} className={`view-button ${view === 'month' ? 'active' : ''}`}>Month</button>
                        <button onClick={today} className="today-button">Today</button>
                        <div className="navigation">
                            <button onClick={prevMonth}>&lt;</button>
                            <button onClick={nextMonth}>&gt;</button>
                        </div>
                    </div>
                </div>
                <div className="custom-calendar-weekdays">
                    {daysOfWeek.map(day => (
                        <div key={day} className="weekday">{day}</div>
                    ))}
                </div>
                <div className="custom-calendar-days">
                    {renderDays()}
                </div>

                {isPopupOpen && (
                    <div className="appointment-popup-overlay">
                        <div className="appointment-popup">
                            <div className="appointment-popup-content">
                                <input
                                    type="text"
                                    placeholder="Doctor Name"
                                    value={doctor}
                                    onChange={(e) => setDoctor(e.target.value)}
                                    className="popup-input"
                                />
                                <input
                                    type="text"
                                    placeholder="Doctor Speciality"
                                    value={speciality}
                                    onChange={(e) => setSpeciality(e.target.value)}
                                    className="popup-input"
                                />
                                <input
                                    type="time"
                                    placeholder="Appointment Time"
                                    value={appointmentTime}
                                    onChange={(e) => setAppointmentTime(e.target.value)}
                                    className="popup-input"
                                />
                                <button className="save-button" onClick={handleAddAppointment}>
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AppointmentPage;
