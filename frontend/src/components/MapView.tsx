import { useEffect, useRef, useState } from 'react';
// @ts-ignore - leaflet types not fully available
import L from 'leaflet';
import { apiGet } from '../utils/api';

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const SAMPLE_LOCATIONS = [
  { lat: 10.3157, lng: 123.8854, name: 'Cebu City - Sample Site 1', status: 'Active' },
  { lat: 10.2968, lng: 123.9098, name: 'Mactan Island - Sample Site 2', status: 'Active' },
  { lat: 10.3228, lng: 123.8765, name: 'Downtown Cebu - Sample Site 3', status: 'Inactive' },
  { lat: 10.3256, lng: 123.9050, name: 'Northern Area - Sample Site 4', status: 'Active' },
];

export function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const sampleMarkersRef = useRef<L.Marker[]>([]);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch latest GPS data from backend
  useEffect(() => {
    async function fetchGps() {
      try {
        const data = await apiGet("/api/sensors/latest");
        if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
          setGps({ lat: data.lat, lng: data.lng });
        }
      } catch (e) {
        // ignore
      }
    }
    fetchGps();
    const interval = setInterval(fetchGps, 5000); // poll every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current).setView([10.3157, 123.8854], 11);
    mapInstanceRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add sample markers
    SAMPLE_LOCATIONS.forEach((location) => {
      const sampleIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      const marker = L.marker([location.lat, location.lng], { icon: sampleIcon }).addTo(map);
      marker.bindPopup(
        `<div style="text-align: center;">
          <strong style="color: #0F2135;">${location.name}</strong><br/>
          <span style="color: #007E88;">Status: ${location.status}</span><br/>
          <span style="font-size: 0.85em; color: #666;">Lat: ${location.lat.toFixed(6)}<br/>Lng: ${location.lng.toFixed(6)}</span>
        </div>`
      );
      sampleMarkersRef.current.push(marker);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      sampleMarkersRef.current = [];
    };
  }, []);

  // Update marker when GPS changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !gps) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([gps.lat, gps.lng]);
    } else {
      markerRef.current = L.marker([gps.lat, gps.lng], { icon }).addTo(map);
      markerRef.current.bindPopup(
        `<div style="text-align: center;">
          <strong style="color: #0F2135;">Device Location</strong><br/>
          <span style="color: #007E88;">Lat: ${gps.lat.toFixed(6)}<br/>Lng: ${gps.lng.toFixed(6)}</span>
        </div>`
      );
    }
    map.setView([gps.lat, gps.lng], 15);
  }, [gps]);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}