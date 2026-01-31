import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});



export function MapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch latest GPS data from backend
  useEffect(() => {
    async function fetchGps() {
      try {
        const res = await fetch("http://localhost:3001/api/sensors/latest");
        const data = await res.json();
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
    const map = L.map(mapRef.current).setView([10.3157, 123.8854], 6); // Default to Visayas
    mapInstanceRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    return () => {
      map.remove();
      mapInstanceRef.current = null;
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
    <div>
      <div ref={mapRef} className="w-full h-[500px]" />
    </div>
  );
}