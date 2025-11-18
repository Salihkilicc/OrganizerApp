import { create } from 'zustand';

type WeeklyForecastItem = {
  day: string;
  temp: number;
  icon: string;
};

type WeatherCoreState = {
  temperature: number | null;
  condition: string | null;
  icon: string | null;
  weekly: WeeklyForecastItem[];
  loading: boolean;
  error: string | null;
};

type WeatherState = WeatherCoreState & {
  fetchWeather: (latitude: number, longitude: number) => Promise<void>;
  reset: () => void;
  setError: (message: string | null) => void;
};

const WEATHER_MAP: Record<number, { icon: string; condition: string }> = {
  0: { icon: '☀️', condition: 'Clear' },
  1: { icon: '🌤️', condition: 'Mainly clear' },
  2: { icon: '⛅', condition: 'Partly cloudy' },
  3: { icon: '☁️', condition: 'Overcast' },
  45: { icon: '🌫️', condition: 'Fog' },
  48: { icon: '🌫️', condition: 'Rime fog' },
  51: { icon: '🌦️', condition: 'Drizzle' },
  61: { icon: '🌧️', condition: 'Rain' },
  71: { icon: '❄️', condition: 'Snow' },
  80: { icon: '🌦️', condition: 'Rain showers' },
  95: { icon: '⛈️', condition: 'Thunderstorm' },
};

const getInitialState = (): WeatherCoreState => ({
  temperature: null,
  condition: null,
  icon: null,
  weekly: [],
  loading: false,
  error: null,
});

const mapWeatherCode = (code?: number) => {
  if (code === undefined || code === null) {
    return { icon: '🌡️', condition: 'Unknown' };
  }
  return WEATHER_MAP[code] ?? { icon: '🌡️', condition: 'Unknown' };
};

type OpenMeteoResponse = {
  current_weather?: {
    temperature?: number;
    weathercode?: number;
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    weathercode?: number[];
  };
};

export const useWeather = create<WeatherState>((set) => ({
  ...getInitialState(),
  fetchWeather: async (latitude, longitude) => {
    set({
      ...getInitialState(),
      loading: true,
    });
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        current_weather: 'true',
        daily: 'temperature_2m_max,weathercode',
        timezone: 'auto',
      });
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error(`Weather request failed (${response.status})`);
      }
      const data = (await response.json()) as OpenMeteoResponse;
      const current = data.current_weather;
      const daily = data.daily;
      if (!current || !daily?.time) {
        throw new Error('Unexpected weather response');
      }

      const weekly: WeeklyForecastItem[] = (daily.time ?? [])
        .map((date, index) => {
          const temp = daily.temperature_2m_max?.[index];
          if (temp === undefined || temp === null) return null;
          const mapping = mapWeatherCode(daily.weathercode?.[index]);
          const parsedDate = new Date(date);
          const dayLabel = parsedDate.toLocaleDateString(undefined, {
            weekday: 'short',
          });
          return {
            day: dayLabel,
            temp: Math.round(temp),
            icon: mapping.icon,
          };
        })
        .filter((item): item is WeeklyForecastItem => item !== null)
        .slice(0, 7);

      const currentMapping = mapWeatherCode(current.weathercode);
      set({
        temperature:
          typeof current.temperature === 'number' ? current.temperature : null,
        condition: currentMapping.condition,
        icon: currentMapping.icon,
        weekly,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('[useWeather] fetchWeather', error);
      set({
        ...getInitialState(),
        error: 'Weather unavailable',
      });
    }
  },
  reset: () => {
    set(getInitialState());
  },
  setError: (message) => {
    set({
      ...getInitialState(),
      error: message,
    });
  },
}));
