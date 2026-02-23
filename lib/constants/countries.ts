export const countries = [
  { code: 'KE', name: 'Kenya', phoneCode: '+254', currency: 'KES' },
  { code: 'UG', name: 'Uganda', phoneCode: '+256', currency: 'UGX' },
  { code: 'TZ', name: 'Tanzania', phoneCode: '+255', currency: 'TZS' },
  { code: 'RW', name: 'Rwanda', phoneCode: '+250', currency: 'RWF' },
  { code: 'BI', name: 'Burundi', phoneCode: '+257', currency: 'BIF' },
  { code: 'ET', name: 'Ethiopia', phoneCode: '+251', currency: 'ETB' },
  { code: 'SO', name: 'Somalia', phoneCode: '+252', currency: 'SOS' },
  { code: 'SS', name: 'South Sudan', phoneCode: '+211', currency: 'SSP' },
  { code: 'US', name: 'United States', phoneCode: '+1', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', phoneCode: '+44', currency: 'GBP' },
  { code: 'CA', name: 'Canada', phoneCode: '+1', currency: 'CAD' },
  { code: 'AU', name: 'Australia', phoneCode: '+61', currency: 'AUD' },
  { code: 'DE', name: 'Germany', phoneCode: '+49', currency: 'EUR' },
  { code: 'FR', name: 'France', phoneCode: '+33', currency: 'EUR' },
  { code: 'IT', name: 'Italy', phoneCode: '+39', currency: 'EUR' },
  { code: 'ES', name: 'Spain', phoneCode: '+34', currency: 'EUR' },
  { code: 'CN', name: 'China', phoneCode: '+86', currency: 'CNY' },
  { code: 'IN', name: 'India', phoneCode: '+91', currency: 'INR' },
  { code: 'JP', name: 'Japan', phoneCode: '+81', currency: 'JPY' },
  { code: 'KR', name: 'South Korea', phoneCode: '+82', currency: 'KRW' },
  { code: 'BR', name: 'Brazil', phoneCode: '+55', currency: 'BRL' },
  { code: 'ZA', name: 'South Africa', phoneCode: '+27', currency: 'ZAR' },
  { code: 'NG', name: 'Nigeria', phoneCode: '+234', currency: 'NGN' },
  { code: 'GH', name: 'Ghana', phoneCode: '+233', currency: 'GHS' },
  { code: 'EG', name: 'Egypt', phoneCode: '+20', currency: 'EGP' },
  { code: 'AE', name: 'United Arab Emirates', phoneCode: '+971', currency: 'AED' },
  { code: 'SA', name: 'Saudi Arabia', phoneCode: '+966', currency: 'SAR' },
] as const;

export type CountryCode = typeof countries[number]['code'];

export const countryMap = countries.reduce((acc, country) => {
  acc[country.code] = country;
  return acc;
}, {} as Record<CountryCode, typeof countries[number]>);

export const defaultCountry = countryMap.KE;
