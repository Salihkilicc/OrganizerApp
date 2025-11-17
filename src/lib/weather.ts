const LAT = Number(process.env.EXPO_PUBLIC_WEATHER_LAT ?? '41.015137');
const LON = Number(process.env.EXPO_PUBLIC_WEATHER_LON ?? '28.979530');

export type WeatherDay = {
  date: string;
  tempMax: number;
  tempMin: number;
  code?: number;
};

export type WeatherResult = {
  currentTemp: number;
  currentCode?: number;
  days: WeatherDay[];
};

type OpenMeteoResponse = {
  current_weather?: {
    temperature?: number;
    weathercode?: number;
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    weathercode?: number[];
  };
};

export async function fetchWeather(): Promise<WeatherResult> {
  const params = new URLSearchParams({
    latitude: LAT.toString(),
    longitude: LON.toString(),
    current_weather: 'true',
    daily: 'weathercode,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) {
    throw new Error(`Weather request failed (${response.status})`);
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const current = data.current_weather;
  const daily = data.daily;
  if (!current || !daily) {
    throw new Error('Unexpected weather response shape');
  }

  const days: WeatherDay[] = (daily.time ?? [])
    .map((date, index) => {
      const tempMax = daily.temperature_2m_max?.[index];
      const tempMin = daily.temperature_2m_min?.[index];
      if (tempMax == null || tempMin == null) return null;
      return {
        date,
        tempMax,
        tempMin,
        code: daily.weathercode?.[index],
      };
    })
    .filter((day): day is WeatherDay => day !== null)
    .slice(0, 7);

  if (days.length === 0) {
    throw new Error('No forecast days available');
  }

  return {
    currentTemp: current.temperature ?? 0,
    currentCode: current.weathercode,
    days,
  };
}

export function mapWeatherCodeToEmoji(code?: number): string {
  if (code === undefined || code === null) return '🌤';
  if (code === 0) return '☀️';
  if (code === 1 || code === 2) return '🌤';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫';
  if (code >= 51 && code <= 67) return '🌧';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌧';
  if (code >= 95) return '⛈';
  return '🌤';
}
