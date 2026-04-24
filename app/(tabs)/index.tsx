import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  SafeAreaView,
} from 'react-native';

const API_URL = 'http://172.20.49.7:8000';

type Crop = {
  id: number;
  name: string;
  variety: string;
  health_status: string;
  predicted_price: number | null;
};

export default function HomeScreen() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/crops`)
      .then((res) => res.json())
      .then((data) => setCrops(data))
      .catch((err) => console.log('Backend error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading crops...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>AgriAI Crops</Text>

      <FlatList
        data={crops}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cropName}>{item.name}</Text>
            <Text>Variety: {item.variety}</Text>
            <Text>Status: {item.health_status}</Text>
            <Text>Price: ₹{item.predicted_price ?? 'N/A'}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#f4fff4',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4fff4',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cropName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});