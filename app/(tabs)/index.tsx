import * as Location from 'expo-location';
import { CloudRain, Droplets, MapPin, RefreshCcw, Thermometer, Wind } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type WeatherCurrent = {
  time: string;
  temperature_2m: number;
  apparent_temperature: number;
  relative_humidity_2m: number;
  precipitation: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
};

type WeatherDaily = {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
};

type WeatherResponse = {
  current: WeatherCurrent;
  daily: WeatherDaily;
};

type Place = {
  city?: string | null;
  district?: string | null;
  region?: string | null;
  country?: string | null;
};

const WEATHER_LABELS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  80: 'Rain showers',
  81: 'Showers',
  82: 'Heavy showers',
  95: 'Thunderstorm',
};

function weatherLabel(code: number) {
  return WEATHER_LABELS[code] ?? 'Current conditions';
}

function formatPlace(place: Place | null) {
  if (!place) return 'Current location';
  return [place.city, place.district, place.region, place.country].filter(Boolean).join(', ');
}

function getWeatherRecommendations(weather: WeatherResponse) {
  const tips: string[] = [];
  const current = weather.current;
  const rainChanceToday = weather.daily.precipitation_probability_max[0] ?? 0;
  const maxTempToday = weather.daily.temperature_2m_max[0] ?? current.temperature_2m;

  if (current.precipitation > 0 || rainChanceToday >= 60) {
    tips.push('Delay pesticide or fertilizer spraying until rain risk drops.');
  } else {
    tips.push('Good window for field inspection, spraying, or light farm work.');
  }

  if (maxTempToday >= 34 || current.apparent_temperature >= 34) {
    tips.push('Irrigate early morning or evening to reduce heat stress.');
  }

  if (current.wind_speed_10m >= 25) {
    tips.push('Avoid spraying today because wind can cause drift and wastage.');
  }

  if (current.relative_humidity_2m >= 80) {
    tips.push('Watch for fungal disease risk in dense or wet crop canopies.');
  }

  return tips.slice(0, 3);
}

export default function HomeScreen() {
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWeather = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Location permission is needed to show local weather.');
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        current: [
          'temperature_2m',
          'apparent_temperature',
          'relative_humidity_2m',
          'precipitation',
          'weather_code',
          'wind_speed_10m',
          'wind_direction_10m',
        ].join(','),
        daily: [
          'temperature_2m_max',
          'temperature_2m_min',
          'precipitation_probability_max',
        ].join(','),
        forecast_days: '4',
        timezone: 'auto',
      });

      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Weather service is unavailable right now.');
      }

      const data: WeatherResponse = await response.json();
      setWeather(data);

      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      setPlace(places[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weather.');
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  const recommendations = weather ? getWeatherRecommendations(weather) : [];

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={styles.loadingText}>Loading local weather...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Weather Report</Text>
            <View style={styles.locationRow}>
              <MapPin size={16} color="#64748b" />
              <Text style={styles.locationText}>{formatPlace(place)}</Text>
            </View>
          </View>

          <Pressable style={styles.refreshButton} onPress={loadWeather}>
            <RefreshCcw size={18} color="#0f766e" />
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Weather unavailable</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadWeather}>
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : weather ? (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.condition}>
                {weatherLabel(weather.current.weather_code)}
              </Text>
              <Text style={styles.temperature}>
                {Math.round(weather.current.temperature_2m)}°C
              </Text>
              <Text style={styles.feelsLike}>
                Feels like {Math.round(weather.current.apparent_temperature)}°C
              </Text>
              <Text style={styles.updatedText}>
                Updated {new Date(weather.current.time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            <View style={styles.metricGrid}>
              <View style={styles.metricCard}>
                <Droplets size={20} color="#0369a1" />
                <Text style={styles.metricLabel}>Humidity</Text>
                <Text style={styles.metricValue}>{weather.current.relative_humidity_2m}%</Text>
              </View>

              <View style={styles.metricCard}>
                <CloudRain size={20} color="#2563eb" />
                <Text style={styles.metricLabel}>Rain Now</Text>
                <Text style={styles.metricValue}>{weather.current.precipitation} mm</Text>
              </View>

              <View style={styles.metricCard}>
                <Wind size={20} color="#475569" />
                <Text style={styles.metricLabel}>Wind</Text>
                <Text style={styles.metricValue}>{weather.current.wind_speed_10m} km/h</Text>
              </View>

              <View style={styles.metricCard}>
                <Thermometer size={20} color="#dc2626" />
                <Text style={styles.metricLabel}>Direction</Text>
                <Text style={styles.metricValue}>{weather.current.wind_direction_10m}°</Text>
              </View>
            </View>

            <View style={styles.recommendationCard}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {recommendations.map((tip, index) => (
                <View key={tip} style={styles.recommendationRow}>
                  <View style={styles.recommendationDot}>
                    <Text style={styles.recommendationNumber}>{index + 1}</Text>
                  </View>
                  <Text style={styles.recommendationText}>{tip}</Text>
                </View>
              ))}
            </View>

            <View style={styles.forecastCard}>
              <Text style={styles.sectionTitle}>4-Day Forecast</Text>
              {weather.daily.time.map((day, index) => (
                <View key={day} style={styles.forecastRow}>
                  <Text style={styles.forecastDay}>
                    {new Date(day).toLocaleDateString([], { weekday: 'short' })}
                  </Text>
                  <Text style={styles.forecastTemp}>
                    {Math.round(weather.daily.temperature_2m_min[index])}° /{' '}
                    {Math.round(weather.daily.temperature_2m_max[index])}°C
                  </Text>
                  <Text style={styles.forecastRain}>
                    {weather.daily.precipitation_probability_max[index]}% rain
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#edf7ee',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#edf7ee',
  },
  loadingText: {
    color: '#64748b',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0f172a',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  locationText: {
    color: '#64748b',
    fontSize: 14,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbe8dd',
  },
  heroCard: {
    backgroundColor: '#0f766e',
    borderRadius: 20,
    padding: 22,
  },
  condition: {
    color: '#ccfbf1',
    fontSize: 18,
    fontWeight: '700',
  },
  temperature: {
    color: '#ffffff',
    fontSize: 72,
    fontWeight: '900',
    lineHeight: 82,
    marginTop: 8,
  },
  feelsLike: {
    color: '#d1fae5',
    fontSize: 16,
  },
  updatedText: {
    color: '#99f6e4',
    fontSize: 12,
    marginTop: 14,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '47.8%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dbe8dd',
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 12,
  },
  metricValue: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  forecastCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dbe8dd',
  },
  recommendationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dbe8dd',
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 10,
  },
  recommendationDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  recommendationNumber: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '900',
  },
  recommendationText: {
    color: '#334155',
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eef4ef',
  },
  forecastDay: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    width: 48,
  },
  forecastTemp: {
    color: '#334155',
    fontSize: 15,
    flex: 1,
  },
  forecastRain: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '700',
  },
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorTitle: {
    color: '#991b1b',
    fontSize: 18,
    fontWeight: '800',
  },
  errorText: {
    color: '#7f1d1d',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#0f766e',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 16,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
