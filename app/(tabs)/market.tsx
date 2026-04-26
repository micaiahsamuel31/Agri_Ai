import { AlertCircle, Minus, Search, TrendingDown, TrendingUp } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get('window').width;

const API_HOST = Platform.OS === 'web' ? '127.0.0.1' : '10.1.7.137';
const BACKEND_URL = `http://${API_HOST}:8000`;

type MarketPoint = {
  date: string;
  price: number;
};

type MarketData = {
  crop_name: string;
  region: string;
  current_price: number;
  predicted_price: number;
  trend: 'rising' | 'falling' | 'stable';
  confidence: number;
  unit: string;
  history: MarketPoint[];
  forecast: MarketPoint[];
  source: string;
  data_quality: 'official' | 'estimated' | string;
  last_updated: string | null;
  market: string | null;
  district: string | null;
  state: string | null;
  min_price: number | null;
  max_price: number | null;
  forecast_available: boolean;
  recommendation: string;
};

const QUICK_CROPS = [
  { id: 'tomato', name: 'Tomato', icon: '🍅' },
  { id: 'onion', name: 'Onion', icon: '🧅' },
  { id: 'potato', name: 'Potato', icon: '🥔' },
  { id: 'wheat', name: 'Wheat', icon: '🌾' },
  { id: 'rice', name: 'Rice', icon: '🍚' },
];

export default function MarketScreen() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('Tomato');
  const [region, setRegion] = useState('Mumbai');
  const [activeCrop, setActiveCrop] = useState('tomato');

  const fetchMarketData = useCallback(async (cropName: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        crop: cropName,
        region,
      });
      const response = await fetch(`${BACKEND_URL}/market-price?${params.toString()}`);
      
      if (!response.ok) throw new Error('Server Error');
      
      const result: MarketData = await response.json();
      setData(result);
    } catch (error) {
      console.error('Backend error:', error);
      setData(null);
      Alert.alert(
        'Connection Error',
        'Could not connect to the backend. Start FastAPI on port 8000 and update BACKEND_URL if you are testing on a phone.'
      );
    } finally {
      setLoading(false);
    }
  }, [region]);

  useEffect(() => {
    fetchMarketData(activeCrop);
  }, [activeCrop, fetchMarketData]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setActiveCrop(searchQuery.toLowerCase().trim());
    }
  };

  const chartPoints = data?.history?.length ? data.history : data?.forecast ?? [];
  const chartLabels = chartPoints.length
    ? chartPoints.map((point) => point.date.replace(/^\w+\s/, ''))
    : ['Today'];
  const chartValues = chartPoints.length
    ? chartPoints.map((point) => point.price)
    : [data?.current_price ?? 0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Market Oracle</Text>
          <Text style={styles.subtitle}>AI-Powered Price Forecasting</Text>
        </View>

        {/* Input Search Field */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={18} color="#94a3b8" />
            <TextInput
              style={styles.input}
              placeholder="Search crop (e.g. Cotton)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>Go</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.regionBar}>
          <TextInput
            style={styles.regionInput}
            placeholder="Region or mandi (e.g. Mumbai, Pune)"
            value={region}
            onChangeText={setRegion}
            onSubmitEditing={() => fetchMarketData(activeCrop)}
          />
        </View>

        {/* Quick Select Chips */}
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
            {QUICK_CROPS.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.chip, activeCrop === item.id && styles.activeChip]}
                onPress={() => {
                  setActiveCrop(item.id);
                  setSearchQuery(item.name);
                }}
              >
                <Text style={styles.chipText}>{item.icon} {item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loaderText}>Fetching Live Mandi Rates...</Text>
          </View>
        ) : data ? (
          <>
            {/* Main Price Card */}
            <View style={styles.card}>
              <View style={styles.priceRow}>
                <View style={styles.priceInfo}>
                  <Text style={styles.label}>
                    {data.crop_name} • {data.data_quality === 'official' ? 'Modal Mandi Price' : 'Estimated Price'}
                  </Text>
                  <Text style={styles.priceText}>₹{data.current_price}</Text>
                  <Text style={styles.unitText}>{data.unit}</Text>
                </View>
                <View style={[styles.badge, data.trend === 'rising' ? styles.rising : data.trend === 'falling' ? styles.falling : styles.stable]}>
                  {data.trend === 'rising' ? (
                    <TrendingUp size={16} color="#065f46" />
                  ) : data.trend === 'falling' ? (
                    <TrendingDown size={16} color="#991b1b" />
                  ) : (
                    <Minus size={16} color="#1d4ed8" />
                  )}
                  <Text style={styles.badgeText}>{data.trend.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Source</Text>
                  <Text style={styles.metaValue}>{data.source}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Market</Text>
                  <Text style={styles.metaValue}>{data.market ?? region}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Min / Max</Text>
                  <Text style={styles.metaValue}>
                    ₹{data.min_price ?? '-'} / ₹{data.max_price ?? '-'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Date</Text>
                  <Text style={styles.metaValue}>{data.last_updated ?? 'Today'}</Text>
                </View>
              </View>

              <LineChart
                data={{
                  labels: chartLabels,
                  datasets: [{ data: chartValues }],
                }}
                width={screenWidth - 70}
                height={180}
                chartConfig={chartConfig}
                bezier
                style={styles.chartStyle}
                withInnerLines={false}
                withOuterLines={false}
              />
            </View>

            {/* Prediction Box */}
            <View style={styles.predictCard}>
              <View>
                <Text style={styles.predictLabel}>
                  {data.forecast_available ? 'Estimated Price (7 Days)' : 'Official Forecast'}
                </Text>
                <Text style={styles.predictPrice}>
                  {data.forecast_available ? `₹${data.predicted_price}` : 'Unavailable'}
                </Text>
              </View>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {data.data_quality === 'official' ? 'Official' : `${(data.confidence * 100).toFixed(0)}% Est.`}
                </Text>
              </View>
            </View>

            {/* Recommendation */}
            <View style={styles.recommendationCard}>
              <View style={styles.flexRow}>
                <AlertCircle size={20} color="#f59e0b" />
                <Text style={styles.recommendationTitle}> Trade Recommendation</Text>
              </View>
              <Text style={styles.recommendationText}>{data.recommendation}</Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No market data available.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
  propsForDots: { r: '5', strokeWidth: '2', stroke: '#10b981' },
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { marginTop: 10, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 14 },
  
  searchSection: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  input: { flex: 1, height: 48, marginLeft: 8, fontSize: 15 },
  searchBtn: { backgroundColor: '#1e293b', paddingHorizontal: 20, borderRadius: 15, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: 'bold' },
  regionBar: { marginBottom: 15 },
  regionInput: { backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: '#e2e8f0', height: 48, paddingHorizontal: 14, fontSize: 15 },

  chipContainer: { marginBottom: 20 },
  chip: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, marginRight: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  activeChip: { backgroundColor: '#064e3b', borderColor: '#064e3b' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#475569' },

  loaderContainer: { marginTop: 100, alignItems: 'center' },
  loaderText: { marginTop: 12, color: '#94a3b8', fontSize: 16 },
  emptyContainer: { marginTop: 80, alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 15 },

  card: { backgroundColor: '#fff', padding: 15, borderRadius: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  priceInfo: { flex: 1, paddingRight: 12 },
  priceText: { fontSize: 32, fontWeight: 'bold', color: '#1e293b' },
  unitText: { color: '#64748b', fontSize: 12, marginTop: 2 },
  label: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4 },
  rising: { backgroundColor: '#d1fae5' },
  falling: { backgroundColor: '#fee2e2' },
  stable: { backgroundColor: '#dbeafe' },
  badgeText: { fontWeight: 'bold', fontSize: 11 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  metaItem: { width: '47%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 10 },
  metaLabel: { color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 },
  metaValue: { color: '#0f172a', fontSize: 12, fontWeight: '600' },
  chartStyle: { marginVertical: 8, borderRadius: 16, paddingRight: 40 },

  predictCard: { backgroundColor: '#064e3b', padding: 20, borderRadius: 24, marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  predictLabel: { color: '#a7f3d0', fontSize: 11, textTransform: 'uppercase' },
  predictPrice: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  confidenceBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  confidenceText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  recommendationCard: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginTop: 15, borderLeftWidth: 6, borderLeftColor: '#f59e0b', elevation: 2 },
  flexRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  recommendationTitle: { fontWeight: 'bold', fontSize: 16, color: '#1e293b' },
  recommendationText: { color: '#475569', lineHeight: 22, fontStyle: 'italic' }
});
