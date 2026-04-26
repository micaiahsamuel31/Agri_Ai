import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";

export default function App() {
  const [data, setData] = useState(null);
  const [crop, setCrop] = useState("rice");
  const [loading, setLoading] = useState(false);

  const crops = ["rice", "wheat", "cotton", "tomato"];

  const getScoreColor = (score) => {
    if (score > 80) return "green";
    if (score > 50) return "orange";
    return "red";
  };

  const fetchSoil = async () => {
    try {
      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Location permission denied");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const lat = location.coords.latitude;
      const lon = location.coords.longitude;

      const res = await axios.get(
        `http://10.1.6.14:8000/soil?lat=${lat}&lon=${lon}&crop=${crop}`
      );

      setData(res.data);
    } catch (err) {
      alert("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={["#1B5E20", "#2E7D32"]}
          style={styles.header}
        >
          <Text style={styles.title}>Soil Intelligence</Text>
          <Text style={styles.subtitle}>
            Smart farming insights
          </Text>
        </LinearGradient>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Select Crop</Text>

          <View style={styles.cropContainer}>
            {crops.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.cropButton,
                  crop === c && styles.selectedCrop,
                ]}
                onPress={() => {
                  setCrop(c);
                  setData(null);
                }}
              >
                <Text
                  style={[
                    styles.cropText,
                    crop === c && { color: "#fff" },
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={fetchSoil}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Analyze Soil</Text>
            )}
          </TouchableOpacity>

          {data && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Location</Text>
                <Text style={styles.text}>{data.place}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Soil Health Score</Text>
                <Text
                  style={{
                    fontSize: 30,
                    fontWeight: "bold",
                    color: getScoreColor(data.soil_score),
                  }}
                >
                  {data.soil_score}/100
                </Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Soil Details</Text>
                <Text style={styles.text}>pH: {data.soil_data.ph}</Text>
                <Text style={styles.text}>
                  Texture: {data.analysis.texture}
                </Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Recommendation</Text>
                <Text style={styles.text}>
                  {data.recommendation}
                </Text>
                <Text style={styles.text}>
                  {data.fertilizer}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },

  scrollContent: {
    flexGrow: 1,
  },

  header: {
    padding: 25,
    paddingTop: 50,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },

  subtitle: {
    color: "#C8E6C9",
    marginTop: 5,
  },

  body: {
    padding: 20,
  },

  sectionTitle: {
    fontWeight: "600",
    fontSize: 18,
    marginBottom: 10,
  },

  cropContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  cropButton: {
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 12,
    margin: 5,
  },

  selectedCrop: {
    backgroundColor: "#2E7D32",
  },

  cropText: {
    color: "#000",
    fontSize: 15,
  },

  button: {
    backgroundColor: "#1B5E20",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  card: {
    backgroundColor: "#F5F5F5",
    padding: 18,
    borderRadius: 18,
    marginTop: 15,
  },

  cardTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 8,
    color: "#1B5E20",
  },

  text: {
    color: "#333",
    fontSize: 16,
    marginBottom: 6,
  },
});