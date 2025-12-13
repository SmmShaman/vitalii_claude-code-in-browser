/**
 * Utility functions for Footer: geolocation, weather, and distance calculation
 */

// Author's coordinates (Oslo, Norway)
export const AUTHOR_LOCATION = {
  name: 'Oslo, Norway',
  latitude: 59.9139,
  longitude: 10.7522,
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
 * Get user's location using browser Geolocation API first, fallback to IP-based
 */
async function getUserLocation(): Promise<UserLocation> {
  const cached = getCachedLocation();
  if (cached) return cached;

  // Try browser geolocation first for accuracy
  if ('geolocation' in navigator) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          maximumAge: 0,
        });
      });

      // Get city name from reverse geocoding using OpenStreetMap Nominatim
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      try {
        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
          {
            headers: {
              'User-Agent': 'Portfolio-Website',
            },
          }
        );

        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          return {
            city: geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Unknown',
            country: geoData.address?.country || 'Unknown',
            latitude: lat,
            longitude: lon,
          };
        }
      } catch (error) {
        console.log('Reverse geocoding failed, using browser coordinates with fallback city name');
      }

      // If reverse geocoding fails, return coordinates with generic city name
      return {
        city: 'Your location',
        country: 'Unknown',
        latitude: lat,
        longitude: lon,
      };
    } catch (error) {
      console.log('Browser geolocation failed, falling back to IP-based location');
    }
  }

  // Fallback to IP-based location
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
 * Map weather codes to translation keys and emojis
 * Based on WMO Weather interpretation codes
 */
function getWeatherInfo(code: number, language: 'en' | 'no' | 'ua'): { description: string; emoji: string } {
  const weatherKeyMap: Record<number, string> = {
    0: 'weather_clear',
    1: 'weather_mainly_clear',
    2: 'weather_partly_cloudy',
    3: 'weather_overcast',
    45: 'weather_fog',
    48: 'weather_fog',
    51: 'weather_drizzle',
    53: 'weather_drizzle',
    55: 'weather_rain',
    61: 'weather_rain',
    63: 'weather_rain',
    65: 'weather_heavy_rain',
    71: 'weather_light_snow',
    73: 'weather_snow',
    75: 'weather_heavy_snow',
    80: 'weather_rain_showers',
    81: 'weather_rain_showers',
    82: 'weather_rain_showers',
    85: 'weather_snow',
    86: 'weather_heavy_snow',
    95: 'weather_thunderstorm',
    96: 'weather_thunderstorm',
    99: 'weather_thunderstorm',
  };

  const emojiMap: Record<number, string> = {
    0: '☀️',
    1: '🌤️',
    2: '⛅',
    3: '☁️',
    45: '🌫️',
    48: '🌫️',
    51: '🌦️',
    53: '🌦️',
    55: '🌧️',
    61: '🌦️',
    63: '🌧️',
    65: '⛈️',
    71: '🌨️',
    73: '❄️',
    75: '❄️',
    80: '🌧️',
    81: '⛈️',
    82: '⛈️',
    85: '❄️',
    86: '❄️',
    95: '⛈️',
    96: '⛈️',
    99: '⛈️',
  };

  const key = weatherKeyMap[code] || 'weather_partly_cloudy';
  const emoji = emojiMap[code] || '☁️';

  // Import translations dynamically based on language
  const translations = {
    en: {
      weather_clear: 'clear sky',
      weather_mainly_clear: 'mainly clear',
      weather_partly_cloudy: 'partly cloudy',
      weather_overcast: 'overcast',
      weather_fog: 'fog',
      weather_drizzle: 'drizzle',
      weather_rain: 'rain',
      weather_heavy_rain: 'heavy rain',
      weather_light_snow: 'light snow',
      weather_snow: 'snow',
      weather_heavy_snow: 'heavy snow',
      weather_rain_showers: 'rain showers',
      weather_thunderstorm: 'thunderstorm',
    },
    no: {
      weather_clear: 'klar himmel',
      weather_mainly_clear: 'hovedsakelig klart',
      weather_partly_cloudy: 'delvis skyet',
      weather_overcast: 'overskyet',
      weather_fog: 'tåke',
      weather_drizzle: 'yr',
      weather_rain: 'regn',
      weather_heavy_rain: 'kraftig regn',
      weather_light_snow: 'lett snø',
      weather_snow: 'snø',
      weather_heavy_snow: 'kraftig snø',
      weather_rain_showers: 'regnbyger',
      weather_thunderstorm: 'tordenvær',
    },
    ua: {
      weather_clear: 'ясно',
      weather_mainly_clear: 'переважно ясно',
      weather_partly_cloudy: 'хмарно',
      weather_overcast: 'похмуро',
      weather_fog: 'туман',
      weather_drizzle: 'мряка',
      weather_rain: 'дощ',
      weather_heavy_rain: 'сильний дощ',
      weather_light_snow: 'невеликий сніг',
      weather_snow: 'сніг',
      weather_heavy_snow: 'сильний сніг',
      weather_rain_showers: 'злива',
      weather_thunderstorm: 'гроза',
    },
  };

  return {
    description: translations[language][key as keyof typeof translations.en],
    emoji,
  };
}

/**
 * Get weather data from Open-Meteo API
 */
async function getWeather(latitude: number, longitude: number, language: 'en' | 'no' | 'ua'): Promise<WeatherData> {
  const cached = getCachedWeather();
  if (cached) return cached;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch weather');

    const data = await response.json();
    const current = data.current_weather;
    const { description, emoji } = getWeatherInfo(current.weathercode, language);

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
export async function fetchFooterData(language: 'en' | 'no' | 'ua' = 'en'): Promise<FooterData> {
  try {
    // Get user location
    const location = await getUserLocation();

    // Get weather for user's location
    const weather = await getWeather(location.latitude, location.longitude, language);

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

    const errorMessages = {
      en: 'Could not retrieve location data',
      no: 'Kunne ikke hente stedsdata',
      ua: 'Не вдалося отримати дані про локацію',
    };

    return {
      userLocation: null,
      weather: null,
      distance: null,
      error: errorMessages[language],
    };
  }
}
