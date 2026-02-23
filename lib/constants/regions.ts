export const regions = {
  KE: [
    { code: 'NBO', name: 'Nairobi', type: 'city' },
    { code: 'MSA', name: 'Mombasa', type: 'city' },
    { code: 'KIS', name: 'Kisumu', type: 'city' },
    { code: 'NAK', name: 'Nakuru', type: 'city' },
    { code: 'ELD', name: 'Eldoret', type: 'city' },
    { code: 'THK', name: 'Thika', type: 'city' },
    { code: 'MAL', name: 'Malindi', type: 'city' },
    { code: 'KIT', name: 'Kitale', type: 'city' },
    { code: 'GAR', name: 'Garissa', type: 'city' },
    { code: 'KAK', name: 'Kakamega', type: 'city' },
    { code: 'NYE', name: 'Nyeri', type: 'city' },
    { code: 'MER', name: 'Meru', type: 'city' },
    { code: 'LAI', name: 'Lamu', type: 'town' },
    { code: 'VOI', name: 'Voi', type: 'town' },
    { code: 'KIL', name: 'Kilifi', type: 'town' },
    { code: 'MAC', name: 'Machakos', type: 'town' },
    { code: 'BOM', name: 'Bomet', type: 'town' },
    { code: 'KIR', name: 'Kirinyaga', type: 'county' },
    { code: 'MUR', name: 'Murang\'a', type: 'county' },
    { code: 'KIA', name: 'Kiambu', type: 'county' },
  ],
  UG: [
    { code: 'KLA', name: 'Kampala', type: 'city' },
    { code: 'ENT', name: 'Entebbe', type: 'city' },
    { code: 'JIN', name: 'Jinja', type: 'city' },
    { code: 'MBAR', name: 'Mbarara', type: 'city' },
    { code: 'GUL', name: 'Gulu', type: 'city' },
    { code: 'LIRA', name: 'Lira', type: 'city' },
  ],
  TZ: [
    { code: 'DAR', name: 'Dar es Salaam', type: 'city' },
    { code: 'DOD', name: 'Dodoma', type: 'city' },
    { code: 'ARU', name: 'Arusha', type: 'city' },
    { code: 'MBE', name: 'Mbeya', type: 'city' },
    { code: 'MOR', name: 'Morogoro', type: 'city' },
    { code: 'TAN', name: 'Tanga', type: 'city' },
  ],
  RW: [
    { code: 'KGL', name: 'Kigali', type: 'city' },
    { code: 'BUT', name: 'Butare', type: 'city' },
    { code: 'GIS', name: 'Gisenyi', type: 'city' },
    { code: 'RUH', name: 'Ruhengeri', type: 'city' },
  ],
  US: [
    { code: 'NYC', name: 'New York', type: 'city' },
    { code: 'LAX', name: 'Los Angeles', type: 'city' },
    { code: 'CHI', name: 'Chicago', type: 'city' },
    { code: 'HOU', name: 'Houston', type: 'city' },
    { code: 'PHX', name: 'Phoenix', type: 'city' },
    { code: 'PHL', name: 'Philadelphia', type: 'city' },
  ],
  GB: [
    { code: 'LON', name: 'London', type: 'city' },
    { code: 'BIR', name: 'Birmingham', type: 'city' },
    { code: 'MAN', name: 'Manchester', type: 'city' },
    { code: 'LIV', name: 'Liverpool', type: 'city' },
    { code: 'EDI', name: 'Edinburgh', type: 'city' },
    { code: 'GLA', name: 'Glasgow', type: 'city' },
  ],
} as const;

export type RegionCode = keyof typeof regions;

export function getRegions(countryCode: string): Array<{ code: string; name: string; type: string }> {
  return regions[countryCode as RegionCode] || [];
}

export function getRegionName(countryCode: string, regionCode: string): string {
  const countryRegions = getRegions(countryCode);
  const region = countryRegions.find(r => r.code === regionCode);
  return region?.name || regionCode;
}

export const kenyanCounties = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Uasin Gishu', 'Kiambu', 'Machakos',
  'Meru', 'Kilifi', 'Kwale', 'Lamu', 'Tana River', 'Garissa', 'Wajir', 'Mandera',
  'Marsabit', 'Isiolo', 'Kitui', 'Makueni', 'Nyandarua', 'Nyeri', 'Kirinyaga',
  'Murang\'a', 'Embu', 'Tharaka-Nithi', 'Laikipia', 'Nyamira', 'Kisii', 'Bomet',
  'Kericho', 'Kakamega', 'Vihiga', 'Bungoma', 'Busia', 'Siaya', 'Homa Bay',
  'Migori', 'Kisii', 'Nyamira', 'Narok', 'Kajiado', 'Turkana', 'West Pokot',
  'Samburu', 'Trans Nzoia', 'Elgeyo-Marakwet', 'Nandi', 'Baringo', 'Laikipia',
  'Nakuru', 'Narok', 'Kajiado', 'Kericho', 'Bomet', 'Kakamega', 'Vihiga',
  'Bungoma', 'Busia', 'Siaya', 'Kisumu', 'Homa Bay', 'Migori', 'Nyamira',
  'Kisii', 'Bomet', 'Kericho', 'Nakuru', 'Narok', 'Kajiado'
];

export const deliveryZones = {
  NBO: {
    name: 'Nairobi Metro',
    counties: ['Nairobi', 'Kiambu', 'Machakos', 'Kajiado'],
    deliveryDays: 1,
    expressDelivery: true,
  },
  MSA: {
    name: 'Coastal Region',
    counties: ['Mombasa', 'Kilifi', 'Kwale', 'Lamu', 'Tana River'],
    deliveryDays: 2,
    expressDelivery: true,
  },
  KIS: {
    name: 'Western Region',
    counties: ['Kisumu', 'Siaya', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira'],
    deliveryDays: 3,
    expressDelivery: false,
  },
  NAK: {
    name: 'Rift Valley',
    counties: ['Nakuru', 'Narok', 'Bomet', 'Kericho', 'Kajiado'],
    deliveryDays: 3,
    expressDelivery: false,
  },
  ELD: {
    name: 'North Rift',
    counties: ['Uasin Gishu', 'Trans Nzoia', 'Nandi', 'Elgeyo-Marakwet'],
    deliveryDays: 4,
    expressDelivery: false,
  },
  DEFAULT: {
    name: 'Other Regions',
    counties: [],
    deliveryDays: 5,
    expressDelivery: false,
  },
} as const;

export function getDeliveryZone(county: string) {
  for (const [zoneCode, zone] of Object.entries(deliveryZones)) {
    if (zone.counties.includes(county)) {
      return { zoneCode, ...zone };
    }
  }
  return deliveryZones.DEFAULT;
}
