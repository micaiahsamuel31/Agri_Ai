import * as Location from 'expo-location';
import { FlaskConical, MapPin, RefreshCcw, Sprout } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const API_HOST = Platform.OS === 'web' ? '127.0.0.1' : '10.1.7.137';
const API_URL = `http://${API_HOST}:8000`;

type SoilData = {
  location: { lat: number; lon: number };
  place: string;
  region: string;
  soil_data: { ph: number };
  analysis: { texture: string };
  crop: string;
  soil_score: number;
  soil_label: string;
  recommendation: string;
  fertilizer: string;
  source: string;
};

const CROPS = ['rice', 'wheat', 'cotton', 'tomato'];

function scoreColor(score: number) {
  if (score >= 80) return '#15803d';
  if (score >= 50) return '#b45309';
  return '#b91c1c';
}

export default function SoilScreen() {
  const [data, setData] = useState<SoilData | null>(null);
  const [crop, setCrop] = useState('rice');
  const [loading, setLoading] = useState(false);

  async function fetchSoil() {
    setLoading(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow location access for soil analysis.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const params = new URLSearchParams({
        lat: location.coords.latitude.toString(),
        lon: location.coords.longitude.toString(),
        crop,
      });

      const response = await fetch(`${API_URL}/soil?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result: SoilData = await response.json();
      setData(result);
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to fetch soil analysis.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Soil Analysis</Text>
            <Text style={styles.subtitle}>Location-based soil suitability</Text>
          </View>
          <View style={styles.headerIcon}>
            <Sprout size={22} color="#0f766e" />
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Soil Intelligence</Text>
          <Text style={styles.heroCopy}>
            Select a crop and analyse soil conditions for your current location.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Crop</Text>
          <View style={styles.cropGrid}>
            {CROPS.map((item) => {
              const selected = crop === item;
              return (
                <Pressable
                  key={item}
                  style={[styles.cropButton, selected && styles.cropButtonActive]}
                  onPress={() => {
                    setCrop(item);
                    setData(null);
                  }}
                >
                  <Text style={[styles.cropText, selected && styles.cropTextActive]}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable style={styles.analyzeButton} onPress={fetchSoil} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <FlaskConical size={18} color="#ffffff" />
              <Text style={styles.analyzeButtonText}>Analyze Soil</Text>
            </>
          )}
        </Pressable>

        {data ? (
          <>
            <View style={styles.locationCard}>
              <MapPin size={18} color="#64748b" />
              <View style={styles.locationTextWrap}>
                <Text style={styles.metaLabel}>Location</Text>
                <Text style={styles.locationText}>{data.place}</Text>
              </View>
              <Pressable style={styles.refreshButton} onPress={fetchSoil}>
                <RefreshCcw size={16} color="#0f766e" />
              </Pressable>
            </View>

            <View style={styles.scoreCard}>
              <Text style={styles.metaLabel}>Soil Health Score</Text>
              <Text style={[styles.scoreText, { color: scoreColor(data.soil_score) }]}>
                {data.soil_score}/100
              </Text>
              <Text style={styles.scoreLabel}>{data.soil_label}</Text>
            </View>

            <View style={styles.metricGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metaLabel}>pH</Text>
                <Text style={styles.metricValue}>{data.soil_data.ph}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metaLabel}>Texture</Text>
                <Text style={styles.metricValue}>{data.analysis.texture}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metaLabel}>Crop</Text>
                <Text style={styles.metricValue}>{data.crop}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metaLabel}>Source</Text>
                <Text style={styles.metricValue}>{data.source}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Recommendation</Text>
              <Text style={styles.bodyText}>{data.recommendation}</Text>
              <Text style={styles.bodyText}>{data.fertilizer}</Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Ready to analyse</Text>
            <Text style={styles.emptyText}>
              Choose a crop and tap Analyze Soil to use your current location.
            </Text>
          </View>
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbe8dd',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
  heroCard: {
    backgroundColor: '#0f766e',
    borderRadius: 20,
    padding: 22,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  heroCopy: {
    color: '#d1fae5',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#dbe8dd',
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  cropGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cropButton: {
    backgroundColor: '#f8fafc',
    borderColor: '#dbe8dd',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cropButtonActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  cropText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  cropTextActive: {
    color: '#ffffff',
  },
  analyzeButton: {
    backgroundColor: '#0f766e',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  analyzeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  locationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dbe8dd',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationTextWrap: {
    flex: 1,
  },
  locationText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  refreshButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#dbe8dd',
  },
  scoreText: {
    fontSize: 46,
    fontWeight: '900',
    lineHeight: 54,
    marginTop: 6,
  },
  scoreLabel: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '800',
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
  metaLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8,
    textTransform: 'capitalize',
  },
  bodyText: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 22,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#dbe8dd',
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
});
