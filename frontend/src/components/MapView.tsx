import { useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix for default marker icons in Leaflet
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const locations = [
  { id: 1, name: 'New York', lat: 40.7128, lng: -74.0060, value: 450 },
  { id: 2, name: 'Los Angeles', lat: 34.0522, lng: -118.2437, value: 320 },
  { id: 3, name: 'Chicago', lat: 41.8781, lng: -87.6298, value: 280 },
  { id: 4, name: 'Houston', lat: 29.7604, lng: -95.3698, value: 210 },
  { id: 5, name: 'Phoenix', lat: 33.4484, lng: -112.0740, value: 185 },
  { id: 6, name: 'Miami', lat: 25.7617, lng: -80.1918, value: 240 },
];

export function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([39.8283, -98.5795], 4);
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add markers with circles
    locations.forEach((location) => {
      // Add marker
      const marker = L.marker([location.lat, location.lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="text-align: center;">
          <strong style="color: #0F2135;">${location.name}</strong><br/>
          <span style="color: #007E88;">Value: ${location.value}</span>
        </div>
      `);

      // Add circle to represent value
      L.circle([location.lat, location.lng], {
        color: '#007E88',
        fillColor: '#007E88',
        fillOpacity: 0.2,
        radius: location.value * 200,
      }).addTo(map);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div>
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-schistoguard-navy">Interactive Map</h2>
        <p className="text-gray-600 text-sm mt-1">
          Explore location data with interactive markers
        </p>
      </div>
      <div ref={mapRef} className="w-full h-[500px]" />
    </div>
  );
}