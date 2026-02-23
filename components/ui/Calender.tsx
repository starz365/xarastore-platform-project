'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Calendar as CalendarIcon
} from 'lucide-react';
import { cn } from '@/lib/utils/css';

interface CalendarProps {
  value?: Date;
  onChange?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  className?: string;
  showMonthYearPicker?: boolean;
  showTodayButton?: boolean;
  format?: string;
  locale?: string;
}

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function Calendar({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  className,
  showMonthYearPicker = false,
  showTodayButton = true,
  format = 'YYYY-MM-DD',
  locale = 'en-US',
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(value || new Date());
  const [view, setView] = useState<'days' | 'months' | 'years'>('days');
  const [selectedDate, setSelectedDate] = useState<Date | null>(value || null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const firstDayOfMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentYear, currentMonth]);

  const today = new Date();

  const isDateDisabled = (date: Date) => {
    if (disabled) return true;
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    if (!isDateDisabled(newDate)) {
      setSelectedDate(newDate);
      onChange?.(newDate);
      if (showMonthYearPicker) {
        setView('days');
      }
    }
  };

  const handleMonthClick = (monthIndex: number) => {
    const newDate = new Date(currentYear, monthIndex, 1);
    setCurrentDate(newDate);
    setView('days');
  };

  const handleYearClick = (year: number) => {
    const newDate = new Date(year, currentMonth, 1);
    setCurrentDate(newDate);
    setView('months');
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToPreviousYear = () => {
    setCurrentDate(new Date(currentYear - 1, currentMonth, 1));
  };

  const goToNextYear = () => {
    setCurrentDate(new Date(currentYear + 1, currentMonth, 1));
  };

  const goToToday = () => {
    const todayDate = new Date();
    setCurrentDate(todayDate);
    setSelectedDate(todayDate);
    onChange?.(todayDate);
    setView('days');
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return format
      .replace('YYYY', year.toString())
      .replace('MM', month)
      .replace('DD', day);
  };

  const renderDays = () => {
    const days = [];
    const totalCells = 42; // 6 weeks
    
    // Previous month days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = 0; i < firstDayOfMonth; i++) {
      const day = prevMonthLastDay - firstDayOfMonth + i + 1;
      const date = new Date(currentYear, currentMonth - 1, day);
      days.push(
        <button
          key={`prev-${day}`}
          className="h-10 w-10 rounded text-gray-400 opacity-50 cursor-default"
          disabled
        >
          {day}
        </button>
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isToday = isSameDay(date, today);
      const isSelected = selectedDate && isSameDay(date, selectedDate);
      const isDisabled = isDateDisabled(date);

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          disabled={isDisabled}
          className={cn(
            'h-10 w-10 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-600',
            isSelected && 'bg-red-600 text-white',
            !isSelected && isToday && 'border-2 border-red-600',
            !isSelected && !isToday && 'hover:bg-gray-100',
            isDisabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {day}
        </button>
      );
    }

    // Next month days
    const nextMonthDays = totalCells - days.length;
    for (let day = 1; day <= nextMonthDays; day++) {
      days.push(
        <button
          key={`next-${day}`}
          className="h-10 w-10 rounded text-gray-400 opacity-50 cursor-default"
          disabled
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const renderMonths = () => {
    return (
      <div className="grid grid-cols-3 gap-2">
        {months.map((month, index) => (
          <button
            key={month}
            onClick={() => handleMonthClick(index)}
            className={cn(
              'p-3 rounded transition-colors hover:bg-gray-100',
              currentMonth === index && 'bg-red-100 text-red-700 font-medium'
            )}
          >
            {month.substring(0, 3)}
          </button>
        ))}
      </div>
    );
  };

  const renderYears = () => {
    const startYear = Math.floor(currentYear / 10) * 10;
    const years = [];

    for (let i = -1; i < 11; i++) {
      const year = startYear + i;
      const isCurrentYear = year === currentYear;
      const isDisabled = 
        (minDate && year < minDate.getFullYear()) ||
        (maxDate && year > maxDate.getFullYear());

      years.push(
        <button
          key={year}
          onClick={() => handleYearClick(year)}
          disabled={isDisabled}
          className={cn(
            'p-3 rounded transition-colors',
            isCurrentYear && 'bg-red-100 text-red-700 font-medium',
            !isCurrentYear && !isDisabled && 'hover:bg-gray-100',
            isDisabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {year}
        </button>
      );
    }

    return <div className="grid grid-cols-4 gap-2">{years}</div>;
  };

  return (
    <div className={cn('w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPreviousYear}
            disabled={disabled || (minDate && currentYear <= minDate.getFullYear())}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
            aria-label="Previous year"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToPreviousMonth}
            disabled={disabled || (minDate && currentMonth <= minDate.getMonth() && currentYear <= minDate.getFullYear())}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => setView(view === 'days' ? 'months' : view === 'months' ? 'years' : 'days')}
          className="flex items-center space-x-2 px-3 py-1 rounded-lg hover:bg-gray-100 font-medium"
        >
          <CalendarIcon className="w-4 h-4" />
          <span>
            {view === 'days' && `${months[currentMonth]} ${currentYear}`}
            {view === 'months' && currentYear}
            {view === 'years' && `${Math.floor(currentYear / 10) * 10}-${Math.floor(currentYear / 10) * 10 + 9}`}
          </span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={goToNextMonth}
            disabled={disabled || (maxDate && currentMonth >= maxDate.getMonth() && currentYear >= maxDate.getFullYear())}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToNextYear}
            disabled={disabled || (maxDate && currentYear >= maxDate.getFullYear())}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
            aria-label="Next year"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekdays */}
      {view === 'days' && (
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map((day) => (
            <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className={cn(
        view === 'days' && 'grid grid-cols-7 gap-1',
        view === 'months' && 'grid grid-cols-3 gap-2',
        view === 'years' && 'grid grid-cols-4 gap-2'
      )}>
        {view === 'days' && renderDays()}
        {view === 'months' && renderMonths()}
        {view === 'years' && renderYears()}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          {showTodayButton && (
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              Today
            </button>
          )}
          
          {selectedDate && (
            <div className="text-sm text-gray-600">
              Selected: {formatDate(selectedDate)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
