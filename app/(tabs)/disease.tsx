import * as ImagePicker from 'expo-image-picker';
import { Camera, FileImage, Leaf, Upload } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { API_PORT, API_URL } from '@/constants/api';

type DiseasePrediction = {
  crop_name: string;
  filename: string;
  disease_name: string;
  confidence: number;
  severity: string;
  recommendations: string[];
  notes: string;
};

const SEVERITY_COLOR: Record<string, string> = {
  low: '#276749',
  medium: '#B45309',
  high: '#B91C1C',
};

export default function DiseaseDetectionScreen() {
  const [cropName, setCropName] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState('image/jpeg');
  const [imageFilename, setImageFilename] = useState('photo.jpg');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiseasePrediction | null>(null);
  const [message, setMessage] = useState('');

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!res.canceled && res.assets.length > 0) {
      const asset = res.assets[0];

      setImageUri(asset.uri);
      setImageMime(asset.mimeType ?? 'image/jpeg');
      setImageFilename(asset.fileName ?? 'photo.jpg');
      setResult(null);
      setMessage('');
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!res.canceled && res.assets.length > 0) {
      const asset = res.assets[0];

      setImageUri(asset.uri);
      setImageMime(asset.mimeType ?? 'image/jpeg');
      setImageFilename(asset.fileName ?? 'photo.jpg');
      setResult(null);
      setMessage('');
    }
  }

  async function analyzeImage() {
    if (!imageUri) {
      const errorMessage = 'Please select or capture a crop image first.';
      setMessage(errorMessage);
      Alert.alert('No image', errorMessage);
      return;
    }

    setLoading(true);
    setResult(null);
    setMessage('');

    try {
      const formData = new FormData();

      formData.append('crop_name', cropName.trim() || 'Unspecified crop');

      if (Platform.OS === 'web') {
        const imageResponse = await fetch(imageUri);
        const imageBlob = await imageResponse.blob();
        formData.append('image', imageBlob, imageFilename || 'leaf.jpg');
      } else {
        formData.append('image', {
          uri: imageUri,
          type: imageMime,
          name: imageFilename || 'leaf.jpg',
        } as any);
      }

      const response = await fetch(`${API_URL}/api/disease/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Server error: ${response.status}`);
      }

      const data: DiseasePrediction = await response.json();
      setResult(data);
      setMessage('Analysis complete.');
    } catch (error: any) {
      const errorMessage =
        error?.message ??
        `Failed to analyse image. Start FastAPI on port ${API_PORT} and check the backend connection.`;
      setMessage(errorMessage);
      Alert.alert(
        'Error',
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  }

  const severity = result?.severity?.toLowerCase?.() ?? 'low';

  const confidencePercent = result
    ? result.confidence <= 1
      ? Math.round(result.confidence * 100)
      : Math.round(result.confidence)
    : 0;

  const confidenceBar = result
    ? result.confidence <= 1
      ? result.confidence * 100
      : result.confidence
    : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Disease Detection</Text>
            <Text style={styles.subtitle}>Scan crop leaves for quick care guidance</Text>
          </View>
          <View style={styles.headerIcon}>
            <Leaf size={22} color="#0f766e" />
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Leaf Health Check</Text>
        
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Crop Name</Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. Tomato, Wheat, Rice"
            placeholderTextColor="#94a3b8"
            value={cropName}
            onChangeText={(text) => {
              setCropName(text);
              setMessage('');
            }}
            returnKeyType="done"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Crop Image</Text>

          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <FileImage size={42} color="#94a3b8" />
              <Text style={styles.placeholderText}>No image selected</Text>
            </View>
          )}

          <View style={styles.imageActions}>
            <Pressable style={styles.secondaryBtn} onPress={pickImage}>
              <Upload size={18} color="#0f766e" />
              <Text style={styles.secondaryBtnText}>Gallery</Text>
            </Pressable>

            <Pressable style={styles.secondaryBtn} onPress={takePhoto}>
              <Camera size={18} color="#0f766e" />
              <Text style={styles.secondaryBtnText}>Camera</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#0f766e" />
            <Text style={styles.loadingText}>Analysing leaf image...</Text>
          </View>
        ) : (
          <Pressable style={styles.analyseBtn} onPress={analyzeImage}>
            <Text style={styles.analyseBtnText}>Analyse Image</Text>
          </Pressable>
        )}

        {message ? (
          <Text style={[styles.statusText, result ? styles.statusSuccess : styles.statusError]}>
            {message}
          </Text>
        ) : null}

        {result && (
          <View style={styles.resultCard}>
            <View style={styles.diagnosisHeader}>
              <View>
                <Text style={styles.sectionTitle}>Diagnosis Result</Text>
                <Text style={styles.summaryText}>Crop analysed: {result.crop_name}</Text>
              </View>

              <View
                style={[
                  styles.severityBadge,
                  {
                    backgroundColor: SEVERITY_COLOR[severity] ?? '#475569',
                  },
                ]}
              >
                <Text style={styles.severityText}>{severity.toUpperCase()}</Text>
              </View>
            </View>

            <Text style={styles.diseaseName}>{result.disease_name}</Text>

            <View style={styles.confidenceContainer}>
              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceLabel}>AI Confidence</Text>
                <Text style={styles.confidenceValue}>{confidencePercent}%</Text>
              </View>

              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(Math.max(confidenceBar, 0), 100)}%` as any,
                    },
                  ]}
                />
              </View>
            </View>

            
            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Recommended Actions</Text>

            {result.recommendations?.length > 0 ? (
              result.recommendations.map((tip, index) => (
                <View key={`${tip}-${index}`} style={styles.recommendationRow}>
                  <View style={styles.recommendationNumber}>
                    <Text style={styles.recommendationNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.recommendationItem}>{tip}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.recommendationItem}>
                No recommendations available.
              </Text>
            )}
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
  resultCard: {
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
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    color: '#0f172a',
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  imagePlaceholder: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 14,
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: '#dbe8dd',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f8fafc',
  },
  secondaryBtnText: {
    color: '#0f766e',
    fontWeight: '800',
    fontSize: 14,
  },
  analyseBtn: {
    backgroundColor: '#0f766e',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyseBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbe8dd',
  },
  loadingText: {
    color: '#64748b',
    marginTop: 10,
  },
  statusText: {
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusError: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
  },
  statusSuccess: {
    backgroundColor: '#ecfdf5',
    color: '#047857',
  },
  diagnosisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  diseaseName: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  summaryText: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  severityBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  severityText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  confidenceContainer: {
    gap: 8,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  confidenceValue: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '900',
  },
  barTrack: {
    backgroundColor: '#e2e8f0',
    height: 9,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: '#0f766e',
    height: 9,
    borderRadius: 999,
  },
  infoBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoText: {
    color: '#92400e',
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  divider: {
    height: 1,
    backgroundColor: '#eef4ef',
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  recommendationNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  recommendationNumberText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '900',
  },
  recommendationItem: {
    color: '#334155',
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  notes: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
