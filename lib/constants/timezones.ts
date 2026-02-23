export const timezones = [
  { value: 'Africa/Nairobi', label: 'East Africa Time (EAT) - Nairobi', offset: '+03:00' },
  { value: 'Africa/Dar_es_Salaam', label: 'East Africa Time (EAT) - Dar es Salaam', offset: '+03:00' },
  { value: 'Africa/Kampala', label: 'East Africa Time (EAT) - Kampala', offset: '+03:00' },
  { value: 'Africa/Kigali', label: 'Central Africa Time (CAT) - Kigali', offset: '+02:00' },
  { value: 'Africa/Johannesburg', label: 'South Africa Standard Time (SAST) - Johannesburg', offset: '+02:00' },
  { value: 'Africa/Cairo', label: 'Eastern European Time (EET) - Cairo', offset: '+02:00' },
  { value: 'Africa/Lagos', label: 'West Africa Time (WAT) - Lagos', offset: '+01:00' },
  { value: 'America/New_York', label: 'Eastern Time (ET) - New York', offset: '-05:00' },
  { value: 'America/Chicago', label: 'Central Time (CT) - Chicago', offset: '-06:00' },
  { value: 'America/Denver', label: 'Mountain Time (MT) - Denver', offset: '-07:00' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT) - Los Angeles', offset: '-08:00' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT) - London', offset: '+00:00' },
  { value: 'Europe/Paris', label: 'Central European Time (CET) - Paris', offset: '+01:00' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET) - Berlin', offset: '+01:00' },
  { value: 'Europe/Moscow', label: 'Moscow Standard Time (MSK) - Moscow', offset: '+03:00' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST) - Dubai', offset: '+04:00' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST) - Mumbai', offset: '+05:30' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST) - Shanghai', offset: '+08:00' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST) - Tokyo', offset: '+09:00' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET) - Sydney', offset: '+10:00' },
  { value: 'Pacific/Auckland', label: 'New Zealand Standard Time (NZST) - Auckland', offset: '+12:00' },
] as const;

export const defaultTimezone = 'Africa/Nairobi';

export function formatTime(
  date: Date | string,
  timezone: string = defaultTimezone,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...options,
  }).format(dateObj);
}

export function formatDateTime(
  date: Date | string,
  timezone: string = defaultTimezone
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dateObj);
}

export function getTimezoneOffset(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  });
  
  const parts = formatter.formatToParts(now);
  const offset = parts.find(part => part.type === 'timeZoneName')?.value;
  
  return offset || '+00:00';
}

export function convertTimezone(
  date: Date | string,
  fromTimezone: string,
  toTimezone: string
): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const fromFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: fromTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const toFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: toTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const fromParts = fromFormatter.formatToParts(dateObj);
  const toParts = toFormatter.formatToParts(dateObj);
  
  const getPart = (parts: Intl.DateTimeFormatPart[], type: string) => {
    return parts.find(part => part.type === type)?.value || '00';
  };
  
  const year = parseInt(getPart(toParts, 'year'));
  const month = parseInt(getPart(toParts, 'month')) - 1;
  const day = parseInt(getPart(toParts, 'day'));
  const hour = parseInt(getPart(toParts, 'hour'));
  const minute = parseInt(getPart(toParts, 'minute'));
  const second = parseInt(getPart(toParts, 'second'));
  
  return new Date(year, month, day, hour, minute, second);
}

export function isDST(date: Date, timezone: string): boolean {
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  
  const janOffset = getTimezoneOffsetInHours(timezone, jan);
  const julOffset = getTimezoneOffsetInHours(timezone, jul);
  
  return Math.max(janOffset, julOffset) !== janOffset;
}

function getTimezoneOffsetInHours(timezone: string, date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  });
  
  const parts = formatter.formatToParts(date);
  const offset = parts.find(part => part.type === 'timeZoneName')?.value || '+00:00';
  
  const sign = offset.includes('-') ? -1 : 1;
  const hours = parseInt(offset.slice(1, 3));
  const minutes = parseInt(offset.slice(4, 6)) || 0;
  
  return sign * (hours + minutes / 60);
}
