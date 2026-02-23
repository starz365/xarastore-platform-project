xarastore/components/deals/DealTimer.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Zap, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface DealTimerProps {
  endTime: string;
  showIcon?: boolean;
  showLabels?: boolean;
  variant?: 'default' | 'compact' | 'inline';
  className?: string;
  onExpire?: () => void;
  refreshInterval?: number;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  isUrgent: boolean;
}

export function DealTimer({
  endTime,
  showIcon = true,
  showLabels = true,
  variant = 'default',
  className = '',
  onExpire,
  refreshInterval = 1000,
}: DealTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(calculateTimeRemaining());
  const [isClient, setIsClient] = useState(false);

  const calculateTimeRemaining = useCallback((): TimeRemaining => {
    const now = new Date();
    const end = new Date(endTime);
    const difference = end.getTime() - now.getTime();

    if (difference <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: true,
        isUrgent: false,
      };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    const totalSeconds = Math.floor(difference / 1000);

    return {
      days,
      hours,
      minutes,
      seconds,
      totalSeconds,
      isExpired: false,
      isUrgent: totalSeconds <= 3600, // Less than 1 hour
    };
  }, [endTime]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const timer = setInterval(() => {
      const newTime = calculateTimeRemaining();
      setTimeRemaining(newTime);

      if (newTime.isExpired && onExpire) {
        onExpire();
        clearInterval(timer);
      }
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [isClient, calculateTimeRemaining, onExpire, refreshInterval]);

  if (!isClient) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className="animate-pulse bg-gray-200 rounded-md h-8 w-24" />
      </div>
    );
  }

  if (timeRemaining.isExpired) {
    return (
      <div className={cn('flex items-center space-x-2 text-gray-500', className)}>
        {showIcon && <AlertCircle className="w-4 h-4" />}
        <span className="text-sm font-medium">Deal expired</span>
      </div>
    );
  }

  const formatTimeUnit = (value: number): string => {
    return value.toString().padStart(2, '0');
  };

  const getTimerColor = () => {
    if (timeRemaining.isUrgent) {
      return 'bg-red-600 text-white border-red-700';
    }
    return 'bg-gray-100 text-gray-900 border-gray-200';
  };

  const getIconColor = () => {
    if (timeRemaining.isUrgent) {
      return 'text-red-600';
    }
    return 'text-gray-600';
  };

  if (variant === 'inline') {
    return (
      <div className={cn('inline-flex items-center space-x-1 text-sm', className)}>
        {showIcon && <Clock className={cn('w-3 h-3', getIconColor())} />}
        <span className="font-medium">
          {timeRemaining.days > 0 && `${timeRemaining.days}d `}
          {timeRemaining.hours}h {formatTimeUnit(timeRemaining.minutes)}m {formatTimeUnit(timeRemaining.seconds)}s
        </span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        {showIcon && <Clock className={cn('w-4 h-4', getIconColor())} />}
        <div className="flex items-center space-x-1">
          <div className={cn('px-2 py-1 rounded text-xs font-medium', getTimerColor())}>
            {timeRemaining.days > 0 ? `${timeRemaining.days}d ` : ''}
            {timeRemaining.hours}h {formatTimeUnit(timeRemaining.minutes)}m
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center space-x-2">
        {showIcon && (
          <div className={cn('p-1.5 rounded-full', timeRemaining.isUrgent ? 'bg-red-100' : 'bg-gray-100')}>
            {timeRemaining.isUrgent ? (
              <Zap className={cn('w-4 h-4', getIconColor())} />
            ) : (
              <Clock className={cn('w-4 h-4', getIconColor())} />
            )}
          </div>
        )}
        <div>
          <p className={cn('text-sm font-medium', timeRemaining.isUrgent ? 'text-red-600' : 'text-gray-700')}>
            {timeRemaining.isUrgent ? '⚡ Hurry! Deal ends soon' : 'Deal ends in'}
          </p>
          {timeRemaining.isUrgent && (
            <p className="text-xs text-gray-500">Limited stock available</p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {timeRemaining.days > 0 && (
          <>
            <TimeUnit
              value={formatTimeUnit(timeRemaining.days)}
              label="Days"
              isUrgent={timeRemaining.isUrgent}
            />
            <Separator isUrgent={timeRemaining.isUrgent} />
          </>
        )}
        <TimeUnit
          value={formatTimeUnit(timeRemaining.hours)}
          label="Hours"
          isUrgent={timeRemaining.isUrgent}
        />
        <Separator isUrgent={timeRemaining.isUrgent} />
        <TimeUnit
          value={formatTimeUnit(timeRemaining.minutes)}
          label="Minutes"
          isUrgent={timeRemaining.isUrgent}
        />
        <Separator isUrgent={timeRemaining.isUrgent} />
        <TimeUnit
          value={formatTimeUnit(timeRemaining.seconds)}
          label="Seconds"
          isUrgent={timeRemaining.isUrgent}
        />
      </div>

      {timeRemaining.isUrgent && (
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-red-600 h-1.5 rounded-full transition-all duration-1000"
            style={{
              width: `${Math.max(5, (timeRemaining.totalSeconds / 3600) * 100)}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

function TimeUnit({ value, label, isUrgent }: { value: string; label: string; isUrgent: boolean }) {
  return (
    <div className="text-center">
      <div
        className={cn(
          'w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg',
          isUrgent
            ? 'bg-red-600 text-white'
            : 'bg-gray-100 text-gray-900 border border-gray-200'
        )}
      >
        {value}
      </div>
      {label && (
        <span className={cn(
          'text-xs mt-1 block',
          isUrgent ? 'text-red-600' : 'text-gray-600'
        )}>
          {label}
        </span>
      )}
    </div>
  );
}

function Separator({ isUrgent }: { isUrgent: boolean }) {
  return (
    <span className={cn(
      'text-lg font-bold',
      isUrgent ? 'text-red-600' : 'text-gray-400'
    )}>
      :
    </span>
  );
}

interface CountdownProps {
  targetDate: Date;
  className?: string;
}

export function Countdown({ targetDate, className }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - Date.now();
      
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className={cn('flex items-center space-x-4', className)}>
      <TimeBlock value={formatNumber(timeLeft.days)} label="Days" />
      <span className="text-2xl font-bold text-red-600">:</span>
      <TimeBlock value={formatNumber(timeLeft.hours)} label="Hours" />
      <span className="text-2xl font-bold text-red-600">:</span>
      <TimeBlock value={formatNumber(timeLeft.minutes)} label="Minutes" />
      <span className="text-2xl font-bold text-red-600">:</span>
      <TimeBlock value={formatNumber(timeLeft.seconds)} label="Seconds" />
    </div>
  );
}

function TimeBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 bg-red-600 text-white rounded-lg flex items-center justify-center text-2xl font-bold">
        {value}
      </div>
      <span className="text-xs text-gray-600 mt-1 block">{label}</span>
    </div>
  );
}

interface FlashSaleTimerProps {
  endTime: string;
  totalSlots: number;
  bookedSlots: number;
  className?: string;
}

export function FlashSaleTimer({
  endTime,
  totalSlots,
  bookedSlots,
  className,
}: FlashSaleTimerProps) {
  const remainingSlots = totalSlots - bookedSlots;
  const slotPercentage = (bookedSlots / totalSlots) * 100;

  return (
    <div className={cn('space-y-3', className)}>
      <DealTimer
        endTime={endTime}
        variant="compact"
        showIcon={false}
        className="justify-center"
      />
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Slots remaining</span>
          <span className="font-semibold">
            {remainingSlots} / {totalSlots}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-red-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${slotPercentage}%` }}
          />
        </div>
        
        {remainingSlots <= 10 && (
          <p className="text-xs text-red-600 text-center animate-pulse">
            ⚡ Only {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} left!
          </p>
        )}
      </div>
    </div>
  );
}

interface DealBadgeProps {
  endTime: string;
  discount: number;
  className?: string;
}

export function DealBadge({ endTime, discount, className }: DealBadgeProps) {
  const [isUrgent, setIsUrgent] = useState(false);

  const handleExpire = useCallback(() => {
    setIsUrgent(false);
  }, []);

  useEffect(() => {
    const end = new Date(endTime);
    const now = new Date();
    const hoursLeft = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft <= 6) {
      setIsUrgent(true);
    }
  }, [endTime]);

  return (
    <div className={cn(
      'inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium',
      isUrgent
        ? 'bg-red-600 text-white animate-pulse'
        : 'bg-red-100 text-red-700',
      className
    )}>
      <span className="font-bold">{discount}% OFF</span>
      <span className="mx-1">•</span>
      <DealTimer
        endTime={endTime}
        variant="inline"
        showIcon={false}
        onExpire={handleExpire}
        className="text-inherit"
      />
    </div>
  );
}
