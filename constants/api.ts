import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const API_PORT = 8000;

function getExpoHost() {
  const constants = Constants as any;
  const hostUri =
    constants.expoConfig?.hostUri ??
    constants.manifest2?.extra?.expoClient?.hostUri ??
    constants.manifest?.debuggerHost;

  return typeof hostUri === 'string' ? hostUri.split(':')[0] : null;
}

export const API_HOST =
  process.env.EXPO_PUBLIC_API_HOST ??
  (Platform.OS === 'web' ? '127.0.0.1' : getExpoHost() ?? '172.20.48.150');
export const API_URL = `http://${API_HOST}:${API_PORT}`;
