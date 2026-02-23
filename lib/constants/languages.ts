export const languages = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', direction: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', direction: 'ltr' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', direction: 'ltr' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', direction: 'ltr' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', direction: 'ltr' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', direction: 'ltr' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', direction: 'ltr' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', direction: 'ltr' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', direction: 'ltr' },
] as const;

export type LanguageCode = typeof languages[number]['code'];

export const languageMap = languages.reduce((acc, lang) => {
  acc[lang.code] = lang;
  return acc;
}, {} as Record<LanguageCode, typeof languages[number]>);

export const defaultLanguage = languageMap.en;

export const browserLanguages = [
  'en', 'sw', 'fr', 'es', 'ar', 'zh', 'hi', 'pt', 'ru', 'de',
  'ja', 'ko', 'it', 'nl', 'tr', 'pl', 'uk', 'vi', 'th', 'am', 'so'
] as const;

export function getBrowserLanguage(): LanguageCode {
  if (typeof navigator === 'undefined') return 'en';
  
  const browserLang = navigator.language.split('-')[0];
  return (browserLanguages.includes(browserLang as any) ? browserLang : 'en') as LanguageCode;
}

export function formatDate(
  date: Date | string,
  languageCode: LanguageCode = 'en',
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = languageCode === 'sw' ? 'sw-KE' : languageCode;
  
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

export function formatNumber(
  number: number,
  languageCode: LanguageCode = 'en'
): string {
  const locale = languageCode === 'sw' ? 'sw-KE' : languageCode;
  return new Intl.NumberFormat(locale).format(number);
}
