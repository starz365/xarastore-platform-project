export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  formattedAddress?: string;
}

export interface DeliveryEstimate {
  distance: number; // in meters
  duration: number; // in seconds
  cost: number; // in KES
  estimatedDelivery: Date;
}

export class GeolocationService {
  private static instance: GeolocationService;
  private watchId: number | null = null;
  private subscribers: Set<(location: Location) => void> = new Set();

  private constructor() {}

  static getInstance(): GeolocationService {
    if (!GeolocationService.instance) {
      GeolocationService.instance = new GeolocationService();
    }
    return GeolocationService.instance;
  }

  async getCurrentPosition(options: PositionOptions = {}): Promise<Location> {
    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude ?? undefined,
            altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
            heading: position.coords.heading ?? undefined,
            speed: position.coords.speed ?? undefined,
            timestamp: position.timestamp,
          };
          resolve(location);
        },
        (error) => {
          reject(this.mapGeolocationError(error));
        },
        { ...defaultOptions, ...options }
      );
    });
  }

  watchPosition(callback: (location: Location) => void, options: PositionOptions = {}): number {
    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation is not supported');
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: false,
      timeout: 30000,
      maximumAge: 10000,
    };

    this.subscribers.add(callback);

    if (this.watchId === null) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude ?? undefined,
            altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
            heading: position.coords.heading ?? undefined,
            speed: position.coords.speed ?? undefined,
            timestamp: position.timestamp,
          };

          this.subscribers.forEach(cb => cb(location));
        },
        (error) => {
          console.error('Geolocation watch error:', error);
        },
        { ...defaultOptions, ...options }
      );
    }

    return this.watchId;
  }

  unwatchPosition(callback?: (location: Location) => void): void {
    if (callback) {
      this.subscribers.delete(callback);
    } else {
      this.subscribers.clear();
    }

    if (this.subscribers.size === 0 && this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  async getAddressFromCoordinates(latitude: number, longitude: number): Promise<Address> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error('Failed to reverse geocode');
      }

      const data = await response.json();
      
      const address: Address = {
        street: data.address?.road || data.address?.street,
        city: data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        country: data.address?.country,
        postalCode: data.address?.postcode,
        formattedAddress: data.display_name,
      };

      return address;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw error;
    }
  }

  async getCoordinatesFromAddress(address: string): Promise<Location> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );

      if (!response.ok) {
        throw new Error('Failed to geocode address');
      }

      const data = await response.json();
      
      if (!data || data.length === 0) {
        throw new Error('Address not found');
      }

      const result = data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    unit: 'km' | 'miles' = 'km'
  ): number {
    const R = unit === 'km' ? 6371 : 3959; // Earth's radius in km or miles
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  calculateDeliveryEstimate(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    options: {
      averageSpeed?: number; // km/h
      baseCost?: number; // KES
      costPerKm?: number; // KES
      processingTime?: number; // hours
    } = {}
  ): DeliveryEstimate {
    const defaultOptions = {
      averageSpeed: 30, // 30 km/h in urban areas
      baseCost: 200, // KES base delivery fee
      costPerKm: 50, // KES per km
      processingTime: 2, // 2 hours processing time
    };

    const opts = { ...defaultOptions, ...options };
    
    // Calculate distance
    const distanceKm = this.calculateDistance(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude,
      'km'
    );
    
    // Calculate duration (distance / speed + processing time)
    const travelHours = distanceKm / opts.averageSpeed;
    const totalHours = travelHours + opts.processingTime;
    const durationSeconds = Math.ceil(totalHours * 3600);
    
    // Calculate cost
    const distanceCost = distanceKm * opts.costPerKm;
    const cost = Math.ceil(opts.baseCost + distanceCost);
    
    // Calculate estimated delivery time
    const now = new Date();
    const estimatedDelivery = new Date(now.getTime() + (totalHours * 3600 * 1000));
    
    return {
      distance: Math.ceil(distanceKm * 1000), // Convert to meters
      duration: durationSeconds,
      cost,
      estimatedDelivery,
    };
  }

  isLocationInKenya(latitude: number, longitude: number): boolean {
    // Kenya bounding box (approximate)
    const kenyaBounds = {
      minLat: -4.9,
      maxLat: 5.0,
      minLon: 33.9,
      maxLon: 41.9,
    };
    
    return (
      latitude >= kenyaBounds.minLat &&
      latitude <= kenyaBounds.maxLat &&
      longitude >= kenyaBounds.minLon &&
      longitude <= kenyaBounds.maxLon
    );
  }

  getNearestCities(
    latitude: number,
    longitude: number,
    limit: number = 5
  ): Array<{ name: string; distance: number; coordinates: Location }> {
    // Major Kenyan cities with coordinates
    const kenyanCities = [
      { name: 'Nairobi', lat: -1.2921, lon: 36.8219 },
      { name: 'Mombasa', lat: -4.0435, lon: 39.6682 },
      { name: 'Kisumu', lat: -0.0917, lon: 34.7680 },
      { name: 'Nakuru', lat: -0.3031, lon: 36.0800 },
      { name: 'Eldoret', lat: 0.5143, lon: 35.2698 },
      { name: 'Thika', lat: -1.0395, lon: 37.0840 },
      { name: 'Malindi', lat: -3.2176, lon: 40.1164 },
      { name: 'Kitale', lat: 1.0157, lon: 34.9943 },
      { name: 'Garissa', lat: -0.4532, lon: 39.6461 },
      { name: 'Kakamega', lat: 0.2842, lon: 34.7523 },
    ];
    
    // Calculate distances to all cities
    const citiesWithDistances = kenyanCities.map(city => {
      const distance = this.calculateDistance(latitude, longitude, city.lat, city.lon, 'km');
      return {
        name: city.name,
        distance,
        coordinates: {
          latitude: city.lat,
          longitude: city.lon,
          timestamp: Date.now(),
        },
      };
    });
    
    // Sort by distance and return nearest cities
    return citiesWithDistances
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  async getDeliveryZones(): Promise<Map<string, { 
    coordinates: Array<{ lat: number; lon: number }>;
    deliveryCost: number;
    deliveryTime: string;
  }>> {
    // In production, this would fetch from your database/API
    // Hardcoded for demonstration
    const zones = new Map();
    
    zones.set('nairobi-central', {
      coordinates: [
        { lat: -1.2921, lon: 36.8219 },
        { lat: -1.2500, lon: 36.8500 },
        { lat: -1.2800, lon: 36.9000 },
      ],
      deliveryCost: 200,
      deliveryTime: '1-2 hours',
    });
    
    zones.set('nairobi-outskirts', {
      coordinates: [
        { lat: -1.3500, lon: 36.7500 },
        { lat: -1.2000, lon: 36.9500 },
      ],
      deliveryCost: 350,
      deliveryTime: '3-4 hours',
    });
    
    zones.set('mombasa', {
      coordinates: [
        { lat: -4.0435, lon: 39.6682 },
      ],
      deliveryCost: 500,
      deliveryTime: 'Next day',
    });
    
    return zones;
  }

  async isInDeliveryZone(
    latitude: number,
    longitude: number,
    zoneId?: string
  ): Promise<{ inZone: boolean; zoneId?: string; deliveryCost?: number; deliveryTime?: string }> {
    const zones = await this.getDeliveryZones();
    
    if (zoneId) {
      const zone = zones.get(zoneId);
      if (!zone) {
        return { inZone: false };
      }
      
      // Check if point is within zone polygon
      const inZone = this.isPointInPolygon(latitude, longitude, zone.coordinates);
      return {
        inZone,
        zoneId: inZone ? zoneId : undefined,
        deliveryCost: inZone ? zone.deliveryCost : undefined,
        deliveryTime: inZone ? zone.deliveryTime : undefined,
      };
    }
    
    // Check all zones
    for (const [id, zone] of zones.entries()) {
      if (this.isPointInPolygon(latitude, longitude, zone.coordinates)) {
        return {
          inZone: true,
          zoneId: id,
          deliveryCost: zone.deliveryCost,
          deliveryTime: zone.deliveryTime,
        };
      }
    }
    
    return { inZone: false };
  }

  private isPointInPolygon(
    lat: number,
    lon: number,
    polygon: Array<{ lat: number; lon: number }>
  ): boolean {
    // Ray casting algorithm
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lon;
      const yi = polygon[i].lat;
      const xj = polygon[j].lon;
      const yj = polygon[j].lat;
      
      const intersect = ((yi > lat) !== (yj > lat)) &&
        (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private mapGeolocationError(error: GeolocationPositionError): Error {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return new Error('Location permission denied. Please enable location services.');
      case error.POSITION_UNAVAILABLE:
        return new Error('Location information is unavailable.');
      case error.TIMEOUT:
        return new Error('Location request timed out.');
      default:
        return new Error('An unknown error occurred while getting location.');
    }
  }

  async getLocationFromIP(): Promise<Location> {
    try {
      const response = await fetch('https://ipapi.co/json/');
      
      if (!response.ok) {
        throw new Error('Failed to get location from IP');
      }
      
      const data = await response.json();
      
      return {
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('IP geolocation error:', error);
      throw error;
    }
  }

  formatDistance(distance: number, unit: 'km' | 'm' = 'km'): string {
    if (unit === 'km') {
      if (distance < 1) {
        return `${Math.round(distance * 1000)} m`;
      }
      return `${distance.toFixed(1)} km`;
    }
    return `${Math.round(distance)} m`;
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}

export const geolocation = GeolocationService.getInstance();
