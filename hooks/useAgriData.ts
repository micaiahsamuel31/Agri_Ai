import { useEffect, useState } from 'react';

// Use your Mac's IP (e.g., 192.168.x.x) so your physical phone can talk to your laptop
// Example: if your IP was 192.168.1.15
const BASE_URL = 'http://172.20.49.7';
export const useCrops = () => {
  const [crops, setCrops] = useState([]);
  useEffect(() => {
    fetch(`${BASE_URL}/crops`)
      .then(res => res.json())
      .then(data => setCrops(data));
  }, []);
  return crops;
};