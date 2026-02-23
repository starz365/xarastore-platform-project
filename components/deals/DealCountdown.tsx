'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface DealCountdownProps {
  endTime: string;
  onEnd?: () => void;
  className?: string;
}

export function DealCountdown({ endTime, onEnd, className = '' }: DealCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = new Date(endTime).getTime() - Date.now();
    
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      expired: false,
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      if (newTimeLeft.expired && onEnd) {
        onEnd();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, onEnd]);

  if (timeLeft.expired) {
    return (
      <div className={`flex items-center space-x-2 text-gray-500 ${className}`}>
        <Clock className="w-4 h-4" />
        <span className="text-sm">Deal expired</span>
      </div>
    );
  }

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Clock className="w-4 h-4 text-red-600" />
      <div className="flex items-center space-x-1 text-sm">
        {timeLeft.days > 0 && (
          <>
            <span className="font-medium">{timeLeft.days}d</span>
            <span>:</span>
          </>
        )}
        <span className="font-medium">{formatTime(timeLeft.hours)}</span>
        <span>:</span>
        <span className="font-medium">{formatTime(timeLeft.minutes)}</span>
        <span>:</span>
        <span className="font-medium">{formatTime(timeLeft.seconds)}</span>
      </div>
    </div>
  );
}
