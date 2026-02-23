'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: Date;
  onComplete?: () => void;
  className?: string;
  showLabels?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function CountdownTimer({ 
  targetDate, 
  onComplete, 
  className = '',
  showLabels = true 
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  function calculateTimeLeft(): TimeLeft {
    const difference = targetDate.getTime() - Date.now();
    
    if (difference <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        total: 0,
      };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      total: difference,
    };
  }

  useEffect(() => {
    if (timeLeft.total <= 0) {
      onComplete?.();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, timeLeft.total, onComplete]);

  if (timeLeft.total <= 0) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium">
          Time's up!
        </span>
      </div>
    );
  }

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {showLabels && (
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-red-600" />
          <span className="font-medium text-gray-700">Ends in:</span>
        </div>
      )}

      <div className="flex items-center space-x-3">
        <TimeUnit value={formatNumber(timeLeft.days)} label="Days" />
        <span className="text-red-600 font-bold">:</span>
        <TimeUnit value={formatNumber(timeLeft.hours)} label="Hours" />
        <span className="text-red-600 font-bold">:</span>
        <TimeUnit value={formatNumber(timeLeft.minutes)} label="Min" />
        <span className="text-red-600 font-bold">:</span>
        <TimeUnit value={formatNumber(timeLeft.seconds)} label="Sec" />
      </div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-red-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
        {value}
      </div>
      {label && (
        <span className="text-xs text-gray-600 mt-1 block">{label}</span>
      )}
    </div>
  );
}
