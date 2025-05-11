'use client';

import React, { useState, useEffect } from 'react';
// Import the updated CSS file
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
    getDay, // Import getDay for calendar grid
    startOfWeek, // Import startOfWeek for calendar grid
    addDays, // Import addDays for calendar grid
    parseISO, // Import parseISO for date strings from Firestore
    isToday, // Import isToday for styling
    isWeekend, // Optional: to style weekends differently
    compareAsc, // For sorting appointments
} from 'date-fns';

import { db } from '@/lib/firebase'; // Ensure this imports your initialized Firestore instance
import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore'; // Import Timestamp
// Import User type along with getAuth and onAuthStateChanged
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

interface Appointment {
    id: string;
    // Store date as Date object derived from Firestore Timestamp or ISO string
    date: Date;
    time: string;
    doctor: string;
    speciality: string;
    userId: string; // Add userId to the interface
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AppointmentPage = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date()); // Use currentMonth for calendar navigation
    const [selectedDate, setSelectedDate] = useState<Date | null>(null); // Date clicked for popup
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [doctor, setDoctor] = useState('');
    const [speciality, setSpeciality] = useState('');
    const [appointmentTime, setAppointmentTime] = useState('');
    // State to toggle between 'calendar' and 'list' view
    const [view, setView] = useState<'calendar' | 'list'>('calendar');

    const [user, setUser] = useState<User | null>(null); // Explicitly type the user state

     // Listen for auth state changes
    useEffect(() => {
        const auth = getAuth(); // Get the auth instance
        console.log("Firebase Auth instance:", auth); // *** DEBUG LOG ***

        // Explicitly type the currentUser parameter as User | null
        const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
            console.log("Auth state changed:", currentUser); // *** DEBUG LOG ***
            setUser(currentUser);
             // Clear appointments immediately if user logs out
             if (!currentUser) {
                 setAppointments([]);
             }
        });

        // Clean up the subscription when the component unmounts
        return () => {
             console.log("Cleaning up auth state listener."); // *** DEBUG LOG ***
             unsubscribe();
        }
    }, []); // Run only once on mount

    // Fetch appointments when user changes or component mounts
    useEffect(() => {
        const fetchAppointments = async () => {
            // Only fetch if user is not null (meaning auth state has been determined)
            if (!user) {
                setAppointments([]); // Clear appointments if no user
                console.log("No user logged in, skipping appointment fetch."); // Debug
                return;
            }

            console.log(`Workspaceing appointments for user: ${user.uid}`); // Debug

            try {
                 const appointmentsRef = collection(db, 'appointments');
                 // Query where userId matches and order by date and time (Firestore requires index for this)
                const q = query(
                    appointmentsRef,
                    where('userId', '==', user.uid),
                    // Ordering by date and time often requires a composite index in Firestore.
                    // If you encounter errors or performance issues, check the Firestore console
                    // for index suggestions.
                    // orderBy('date', 'asc'),
                    // orderBy('time', 'asc')
                    // For now, we fetch and sort client-side
                );


                const querySnapshot = await getDocs(q);
                const loadedAppointments: Appointment[] = [];

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                     // Assuming date is stored as ISO string OR Timestamp
                    let date: Date;
                    if (data.date instanceof Timestamp) {
                         date = data.date.toDate();
                    } else if (typeof data.date === 'string') {
                         date = parseISO(data.date);
                    } else {
                        console.warn("Appointment date is not Timestamp or string:", data.date);
                         // Skip this appointment or handle error
                        return;
                    }


                    loadedAppointments.push({
                        id: doc.id,
                        date: date,
                        time: data.time,
                        doctor: data.doctor,
                        speciality: data.speciality,
                        userId: data.userId, // Ensure userId is loaded
                    });
                });

                 // Sort appointments by date and time for consistent display in both views
                 loadedAppointments.sort((a, b) => {
                     const dateComparison = compareAsc(a.date, b.date);
                     if (dateComparison !== 0) {
                         return dateComparison;
                     }
                     // Simple string comparison for time (HH:MM assumed)
                     return a.time.localeCompare(b.time);
                 });

                setAppointments(loadedAppointments);
                console.log("Appointments fetched and sorted:", loadedAppointments); // Debug

            } catch (error) {
                console.error("Error fetching appointments:", error); // Debug
                 alert("Failed to load appointments.");
            } finally {
                // You might want a loading state for fetching appointments too
                // setLoadingAppointments(false);
            }
        };

        // Only fetch if user is not null (meaning auth state has been determined)
        if (user !== null) {
             fetchAppointments();
        }


    }, [user]); // Refetch when user state changes

    // Sync currentMonth with today's date when the component mounts, or if the view is switched to calendar and currentMonth is still default
     useEffect(() => {
        if (view === 'calendar' && !currentMonth) {
             setCurrentMonth(new Date());
        }
     }, [view, currentMonth]);


    const prevMonth = () => {
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const nextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
    };

    const goToToday = () => {
        setCurrentMonth(new Date()); // Go to the current month
        // If in list view, might want to scroll to today's appointments
         if (view === 'list') {
             // Implement scroll to today if needed - potentially find the first appointment today and scroll to its element
             console.log("Go to Today button clicked in List View - scrolling not implemented.");
         }
    };

    const handleDayClick = (day: Date) => {
        // Ensure user is logged in before opening popup
        if (!user) {
             alert("Please log in to add appointments.");
             return;
        }
        setSelectedDate(day);
        setIsPopupOpen(true);
        // Clear form fields for new entry
        setDoctor('');
        setSpeciality('');
        setAppointmentTime('');
    };

    const closePopup = () => {
        setIsPopupOpen(false);
        setSelectedDate(null); // Clear selected date on closing popup
    };

    const handleAddAppointment = async () => {
        // User check is already done in handleDayClick and at the start of this function
        if (!user) return;


        // Basic validation
        if (selectedDate && doctor.trim() && speciality.trim() && appointmentTime) {
            try {
                 // Convert selectedDate to Firestore Timestamp
                const appointmentTimestampForFirestore = Timestamp.fromDate(selectedDate);

                 // Add document to Firestore
                const docRef = await addDoc(collection(db, 'appointments'), {
                    userId: user.uid, // Store UID with appointment
                    date: appointmentTimestampForFirestore, // Store date as Timestamp
                    time: appointmentTime,
                    doctor: doctor.trim(), // Trim whitespace
                    speciality: speciality.trim(), // Trim whitespace
                    createdAt: Timestamp.now(), // Optional: Add a creation timestamp for ordering
                });

                console.log("Appointment added with ID:", docRef.id); // Debug

                // Optimistically update state with the new appointment
                 const newAppointment: Appointment = {
                     id: docRef.id, // Use the ID assigned by Firestore
                     date: selectedDate, // Use the Date object
                     time: appointmentTime,
                     doctor: doctor.trim(),
                     speciality: speciality.trim(),
                     userId: user.uid,
                 };
                 // Add new appointment and resort
                 setAppointments(prev => [...prev, newAppointment].sort((a, b) => {
                      const dateComparison = compareAsc(a.date, b.date);
                      if (dateComparison !== 0) {
                          return dateComparison;
                      }
                       return a.time.localeCompare(b.time);
                 }));


                closePopup();
                alert("✅ Appointment added successfully!");

            } catch (error) {
                console.error("Error adding appointment:", error); // Debug
                alert("❌ Failed to add appointment.");
            }

        } else {
            alert('Please fill in all the fields.');
        }
    };

    // Helper to get appointments for a specific date
    const getAppointmentsForDate = (date: Date) => {
        return appointments.filter((appt) => isSameDay(appt.date, date));
    };

    // Render the calendar grid view
    const renderCalendarDays = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const startDate = startOfWeek(monthStart); // Start from the first day of the week of the month start

        const days = [];
        let day = startDate;

        // Generate days for 5 weeks (most months fit in 5 weeks in a calendar grid)
        // You could add logic here to render 6 weeks if needed for certain month layouts
        for (let i = 0; i < 35; i++) { // 7 days/week * 5 weeks = 35 days
            const currentDay = new Date(day); // Create a new Date object for each day

            const isCurrentMonth = currentDay.getMonth() === currentMonth.getMonth() &&
                                   currentDay.getFullYear() === currentMonth.getFullYear();
            const dateAppointments = getAppointmentsForDate(currentDay);
            const isTodayDate = isToday(currentDay);
            const isSelectedDate = selectedDate && isSameDay(currentDay, selectedDate);


            days.push(
                <div
                    key={currentDay.toISOString()} // Use ISO string for stable key
                    className={`custom-calendar-days day ${!isCurrentMonth ? 'dull' : ''} ${isTodayDate ? 'today' : ''} ${isSelectedDate ? 'selected' : ''}`}
                    onClick={() => isCurrentMonth && handleDayClick(currentDay)}
                >
                    {/* Day number aligned to top-right */}
                    <div className="day-number">{currentDay.getDate()}</div>

                    {/* Appointment brief details */}
                    {dateAppointments.length > 0 && (
                        <div className="appointment-details">
                            {dateAppointments.map((appt) => (
                                 // Use appointment ID for key
                                <div key={appt.id} className="appointment-brief">
                                    <span className="appointment-time">{appt.time}</span>
                                    <span className="appointment-doctor">{appt.doctor}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );

            day = addDays(day, 1); // Move to the next day
        }

        return days;
    };

    // Render the list view
    const renderListView = () => {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        // Separate appointments into past and upcoming
        const pastAppointments = appointments
            .filter(appt => compareAsc(appt.date, today) < 0)
            .sort((a, b) => compareAsc(b.date, a.date)); // Sort newest to oldest
        
        const upcomingAppointments = appointments
            .filter(appt => compareAsc(appt.date, today) >= 0)
            .sort((a, b) => compareAsc(a.date, b.date)); // Sort oldest to newest

        const renderAppointmentItem = (appt: Appointment, isPast: boolean = false) => (
            <div
                key={appt.id}
                className={`custom-appointment-item ${isPast ? 'past-appointment' : ''}`}
            >
                <div className="custom-appointment-details">
                    <div className="flex items-center gap-3 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <p className="doctor-name text-lg">{appt.doctor}</p>
                    </div>
                    <p className="text-gray-600 ml-8">{appt.speciality}</p>
                </div>
                <div className="custom-appointment-date-time">
                    <span className="date">{format(appt.date, 'EEEE, MMMM d, yyyy')}</span>
                    <span className="time">{appt.time}</span>
                    <span className={`status-badge ${isPast ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}`}>
                        {isPast ? 'Completed' : 'Upcoming'}
                    </span>
                </div>
            </div>
        );

        if (!appointments.length) {
            return (
                <div className="custom-no-appointments">
                    <p className="text-xl font-medium text-gray-700">No appointments added yet</p>
                    <p className="text-gray-500 mt-2">Click on any date in the calendar to schedule an appointment</p>
                </div>
            );
        }

        return (
            <div className="custom-list-view">
                {/* Upcoming Appointments Section */}
                <div className="appointments-section">
                    <h3>
                        <span className="section-title">Upcoming Appointments</span>
                        <span className="appointment-count">{upcomingAppointments.length}</span>
                    </h3>
                    <div className="appointments-list">
                        {upcomingAppointments.length > 0 ? (
                            upcomingAppointments.map(appt => renderAppointmentItem(appt))
                        ) : (
                            <p className="no-appointments-message">No upcoming appointments scheduled</p>
                        )}
                    </div>
                </div>

                {/* Past Appointments Section */}
                <div className="appointments-section">
                    <h3>
                        <span className="section-title">Past Appointments</span>
                        <span className="appointment-count">{pastAppointments.length}</span>
                    </h3>
                    <div className="appointments-list">
                        {pastAppointments.length > 0 ? (
                            pastAppointments.map(appt => renderAppointmentItem(appt, true))
                        ) : (
                            <p className="no-appointments-message">No past appointments</p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        // Main container with full width
        <div className="w-full min-h-screen bg-gray-50">
            {/* Content container with padding */}
            <div className="p-4 md:p-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Appointments</h1>

                {!user && (
                    <div className="text-center py-10 bg-white rounded-xl shadow-md max-w-2xl mx-auto w-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6.364-3.636l-1.414-1.414a9 9 0 1015.556 0L16.364 13.364A7 7 0 0012 15zm0 0a1 1 0 100-2 1 1 0 000 2z" />
                        </svg>
                        <p className="text-xl font-medium text-gray-700 mb-2">Authentication Required</p>
                        <p className="text-md text-gray-600">Please log in to view and add appointments.</p>
                        {/* Add a login button here if you have a router setup */}
                    </div>
                )}

                {user && (
                    <div className="bg-white rounded-lg shadow-md w-full">
                        <div className="custom-view-container">
                            {/* Header controls */}
                            <div className="custom-header-controls">
                                {/* Month and Year or List Title */}
                                {view === 'calendar' ? (
                                    <div className="custom-month-year">
                                        {format(currentMonth, 'MMMM yyyy')} {/* Corrected format string */}
                                    </div>
                                ) : (
                                    // Title for the List View in the header
                                    <div className="custom-month-year">
                                        Appointment List
                                    </div>
                                )}

                                {/* Navigation and Action Buttons */}
                                <div className="custom-view-actions">
                                    {/* Calendar/List View Toggle */}
                                    <button
                                        onClick={() => setView('calendar')}
                                        className={`view-button ${view === 'calendar' ? 'active' : ''}`}
                                    >
                                        Calendar
                                    </button>
                                    <button
                                        onClick={() => setView('list')}
                                        className={`view-button ${view === 'list' ? 'active' : ''}`}
                                    >
                                        List
                                    </button>

                                    {/* Today Button (visible in Calendar view) */}
                                    {view === 'calendar' && (
                                        <button onClick={goToToday} className="today-button">Today</button>
                                    )}

                                    {/* Month Navigation (visible in Calendar view) */}
                                    {view === 'calendar' && (
                                        <div className="custom-navigation">
                                            {/* Use SVG icons for navigation buttons */}
                                            <button onClick={prevMonth} aria-label="Previous Month">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                                </svg>
                                            </button>
                                            <button onClick={nextMonth} aria-label="Next Month">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Render Weekdays header only in Calendar view */}
                            {view === 'calendar' && (
                                <div className="custom-calendar-weekdays">
                                    {daysOfWeek.map(day => (
                                        <div key={day} className="weekday">{day}</div>
                                    ))}
                                </div>
                            )}

                            {/* Conditional Rendering based on view state */}
                            {view === 'calendar' ? (
                                // Calendar Days Grid Container
                                <div className="custom-calendar-days">
                                    {renderCalendarDays()}
                                </div>
                            ) : (
                                // List View Container - padding is added inside renderListView
                                <div className="custom-list-container"> {/* Container for list view within the main view container */}
                                    {renderListView()}
                                </div>
                            )}

                            {/* Appointment Popup Overlay */}
                            {isPopupOpen && selectedDate && (
                                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
                                    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
                                        {/* Header Section */}
                                        <div className="bg-teal-600 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
                                            <h3 className="text-xl font-semibold">New Appointment</h3>
                                            <button 
                                                onClick={closePopup}
                                                className="text-white hover:bg-teal-700 rounded-full p-1 transition-colors"
                                            >
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Form Content */}
                                        <div className="p-6 space-y-6">
                                            <div className="text-center mb-6">
                                                <p className="text-gray-600">Scheduling for</p>
                                                <p className="text-lg font-semibold text-gray-800">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Doctor Name <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={doctor}
                                                        onChange={(e) => setDoctor(e.target.value)}
                                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                                                        placeholder="Enter doctor's name"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Speciality <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={speciality}
                                                        onChange={(e) => setSpeciality(e.target.value)}
                                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                                                        placeholder="Enter speciality"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Appointment Time <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="time"
                                                        value={appointmentTime}
                                                        onChange={(e) => setAppointmentTime(e.target.value)}
                                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer Actions */}
                                        <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex justify-end space-x-3">
                                            <button
                                                onClick={closePopup}
                                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleAddAppointment}
                                                disabled={!doctor.trim() || !speciality.trim() || !appointmentTime}
                                                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg
                                                    hover:bg-teal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                            >
                                                Save Appointment
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AppointmentPage;