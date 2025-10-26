/**
 * Utility functions for Footer: geolocation, weather, and distance calculation
 */

// Author's coordinates (Lena, Norway)
export const AUTHOR_LOCATION = {
  name: 'Lena, Norway',
  latitude: 60.6667,
  longitude: 10.8167,
};

// Types
export interface UserLocation {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface WeatherData {
  temperature: number;
  weatherCode: number;
  description: string;
  emoji: string;
}

export interface FooterData {
  userLocation: UserLocation | null;
  weather: WeatherData | null;
  distance: number | null;
  error?: string;
}

// Cache keys
const CACHE_KEY_LOCATION = 'footer_user_location';
const CACHE_KEY_WEATHER = 'footer_weather_data';
const CACHE_KEY_TIMESTAMP = 'footer_cache_timestamp';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Check if cached data is still valid
 */
function isCacheValid(): boolean {
  const timestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);
  if (!timestamp) return false;
  const age = Date.now() - parseInt(timestamp);
  return age < CACHE_DURATION;
}

/**
 * Get cached location
 */
function getCachedLocation(): UserLocation | null {
  if (!isCacheValid()) return null;
  const cached = localStorage.getItem(CACHE_KEY_LOCATION);
  return cached ? JSON.parse(cached) : null;
}

/**
 * Get cached weather
 */
function getCachedWeather(): WeatherData | null {
  if (!isCacheValid()) return null;
  const cached = localStorage.getItem(CACHE_KEY_WEATHER);
  return cached ? JSON.parse(cached) : null;
}

/**
 * Cache location and weather data
 */
function cacheData(location: UserLocation, weather: WeatherData): void {
  localStorage.setItem(CACHE_KEY_LOCATION, JSON.stringify(location));
  localStorage.setItem(CACHE_KEY_WEATHER, JSON.stringify(weather));
  localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());
}

/**
 * Get user's location from IP address using ipapi.co
 */
async function getUserLocation(): Promise<UserLocation> {
  const cached = getCachedLocation();
  if (cached) return cached;

  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) throw new Error('Failed to fetch location');

    const data = await response.json();
    return {
      city: data.city || 'Unknown',
      country: data.country_name || 'Unknown',
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch (error) {
    console.error('Error fetching user location:', error);
    throw error;
  }
}

/**
 * Map weather codes to descriptions and emojis
 * Based on WMO Weather interpretation codes
 */
function getWeatherInfo(code: number): { description: string; emoji: string } {
  const weatherMap: Record<number, { description: string; emoji: string }> = {
    0: { description: 'ясно', emoji: '☀️' },
    1: { description: 'переважно ясно', emoji: '🌤️' },
    2: { description: 'хмарно', emoji: '⛅' },
    3: { description: 'похмуро', emoji: '☁️' },
    45: { description: 'туман', emoji: '🌫️' },
    48: { description: 'туман', emoji: '🌫️' },
    51: { description: 'мряка', emoji: '🌦️' },
    53: { description: 'мряка', emoji: '🌦️' },
    55: { description: 'дощ', emoji: '🌧️' },
    61: { description: 'невеликий дощ', emoji: '🌦️' },
    63: { description: 'дощ', emoji: '🌧️' },
    65: { description: 'сильний дощ', emoji: '⛈️' },
    71: { description: 'невеликий сніг', emoji: '🌨️' },
    73: { description: 'сніг', emoji: '❄️' },
    75: { description: 'сильний сніг', emoji: '❄️' },
    80: { description: 'злива', emoji: '🌧️' },
    81: { description: 'злива', emoji: '⛈️' },
    82: { description: 'сильна злива', emoji: '⛈️' },
    85: { description: 'сніг', emoji: '❄️' },
    86: { description: 'сильний сніг', emoji: '❄️' },
    95: { description: 'гроза', emoji: '⛈️' },
    96: { description: 'гроза з градом', emoji: '⛈️' },
    99: { description: 'гроза з градом', emoji: '⛈️' },
  };

  return weatherMap[code] || { description: 'хмарно', emoji: '☁️' };
}

/**
 * Get weather data from Open-Meteo API
 */
async function getWeather(latitude: number, longitude: number): Promise<WeatherData> {
  const cached = getCachedWeather();
  if (cached) return cached;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch weather');

    const data = await response.json();
    const current = data.current_weather;
    const { description, emoji } = getWeatherInfo(current.weathercode);

    return {
      temperature: Math.round(current.temperature),
      weatherCode: current.weathercode,
      description,
      emoji,
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw error;
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Round to nearest 10 km
  return Math.round(distance / 10) * 10;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Fetch all footer data (location, weather, distance)
 */
export async function fetchFooterData(): Promise<FooterData> {
  try {
    // Get user location
    const location = await getUserLocation();

    // Get weather for user's location
    const weather = await getWeather(location.latitude, location.longitude);

    // Calculate distance
    const distance = calculateDistance(
      AUTHOR_LOCATION.latitude,
      AUTHOR_LOCATION.longitude,
      location.latitude,
      location.longitude
    );

    // Cache the data
    cacheData(location, weather);

    return {
      userLocation: location,
      weather,
      distance,
    };
  } catch (error) {
    console.error('Error fetching footer data:', error);
    return {
      userLocation: null,
      weather: null,
      distance: null,
      error: 'Не вдалося отримати дані про локацію',
    };
  }
}

/**
 * Get avatar state based on temperature and weather
 */
export function getAvatarState(weather: WeatherData | null): {
  outfit: 'scarf' | 'normal' | 'tshirt';
  accessory: 'umbrella' | 'hat' | null;
} {
  if (!weather) {
    return { outfit: 'normal', accessory: null };
  }

  let outfit: 'scarf' | 'normal' | 'tshirt' = 'normal';
  let accessory: 'umbrella' | 'hat' | null = null;

  // Temperature-based outfit
  if (weather.temperature < 5) {
    outfit = 'scarf';
  } else if (weather.temperature > 20) {
    outfit = 'tshirt';
  }

  // Weather-based accessories
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weather.weatherCode)) {
    accessory = 'umbrella'; // Rain
  } else if ([71, 73, 75, 85, 86].includes(weather.weatherCode)) {
    accessory = 'hat'; // Snow
  }

  return { outfit, accessory };
}
