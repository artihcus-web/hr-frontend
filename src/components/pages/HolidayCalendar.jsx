import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';

const HolidayCalendar = () => {
    const holidays2026 = [
        { month: 0, day: 1, name: "New Year", dateStr: "Thursday, January 1" },
        { month: 0, day: 14, name: "Sankranti/Pongal", dateStr: "Wednesday, January 14" },
        { month: 0, day: 26, name: "Republic Day", dateStr: "Monday, January 26" },
        { month: 2, day: 19, name: "Ugadi", dateStr: "Thursday, March 19" },
        { month: 4, day: 1, name: "May Day", dateStr: "Friday, May 1" },
        { month: 8, day: 14, name: "Ganesh Chaturthi", dateStr: "Monday, September 14" },
        { month: 9, day: 2, name: "Gandhi Jayanti", dateStr: "Friday, October 2" },
        { month: 9, day: 21, name: "Dussehra", dateStr: "Wednesday, October 21" },
        { month: 10, day: 9, name: "Diwali", dateStr: "Monday, November 09" },
        { month: 11, day: 25, name: "Christmas", dateStr: "Friday, December 25" },
    ];

    const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)); // Default Jan 2026

    const changeMonth = (offset) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };

    const getWeekNumber = (d) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNo;
    };

    const renderCalendarGrid = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // 0 = Sunday, 1 = Monday, ... 6 = Saturday
        // We want Monday (0) to Sunday (6)
        let firstDayIndex = new Date(year, month, 1).getDay();
        firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

        // Calculate the start date of the grid (the first Monday visible)
        const startDate = new Date(year, month, 1 - firstDayIndex);

        const items = [];

        // We need 6 rows to cover all possibilities (42 days)
        for (let row = 0; row < 6; row++) {
            // 1. Add Week Number for this row
            const weekDate = new Date(startDate);
            weekDate.setDate(startDate.getDate() + (row * 7));
            const weekNum = getWeekNumber(weekDate);

            items.push(
                <div key={`wk-${row}`} className="flex items-center justify-center border-r border-gray-100 bg-gray-50/50 text-gray-400 text-xs font-bold">
                    W{weekNum}
                </div>
            );

            // 2. Add the 7 days of the week
            for (let day = 0; day < 7; day++) {
                const currentDayDate = new Date(weekDate);
                currentDayDate.setDate(weekDate.getDate() + day);

                const isCurrentMonth = currentDayDate.getMonth() === month;
                const dateNum = currentDayDate.getDate();

                // Check holiday
                // Note: holidays2026 uses 0-indexed months and rigid days. 
                // We should match strictly against the known array.
                const isHoliday = isCurrentMonth && holidays2026.some(h => h.month === month && h.day === dateNum);
                const holidayInfo = isHoliday ? holidays2026.find(h => h.month === month && h.day === dateNum) : null;

                items.push(
                    <div
                        key={`day-${row}-${day}`}
                        className={`
                            relative py-3 flex flex-col items-center justify-center transition-all duration-200 min-h-[80px]
                            ${!isCurrentMonth ? 'bg-gray-50/20 text-gray-300' : 'text-gray-700 hover:bg-gray-50'}
                            ${isHoliday ? 'bg-indigo-50/50 text-indigo-700 shadow-sm border border-indigo-100' : ''}
                        `}
                    >
                        <span className={`text-sm ${isHoliday ? 'font-bold' : 'font-medium'}`}>{dateNum}</span>
                        {isHoliday && (
                            <span className='hidden sm:block text-[10px] text-center bg-white/80 px-1 rounded mt-1 shadow-sm w-[90%] truncate leading-tight'>
                                {holidayInfo.name}
                            </span>
                        )}
                        {isHoliday && (
                            <div className="sm:hidden w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1"></div>
                        )}
                    </div>
                );
            }
        }

        return items;
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 font-sans">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Holiday Calendar</h1>
                    <p className="text-gray-500 text-xs">Organization holidays for 2026</p>
                </div>

                {/* Calendar View */}
                <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                        <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-500 hover:text-gray-900 transition-colors">
                            <FiChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-lg font-bold text-gray-800 tracking-tight">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-500 hover:text-gray-900 transition-colors">
                            <FiChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 bg-white">
                        {/* Header Row: Wk + 7 Days */}
                        <div className="grid grid-cols-8 border-b border-gray-100 bg-gray-50/30">
                            <div className="py-3 text-center border-r border-gray-100 bg-gray-50/50">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">#</span>
                            </div>
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                                <div key={d} className="py-3 text-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{d}</span>
                                </div>
                            ))}
                        </div>

                        {/* Grid Body */}
                        <div className="grid grid-cols-8 divide-y divide-gray-50">
                            {renderCalendarGrid()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HolidayCalendar;
