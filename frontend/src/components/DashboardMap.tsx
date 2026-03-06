import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface DashboardMapProps {
  sites?: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
  }>;
}

export function DashboardMap({ sites }: DashboardMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    try {
      // Default sites with Tacloban City coordinates
      const defaultSites = [
        { id: 'site-1', name: "Mang Jose's Fish Pond", lat: 11.2447, lng: 125.0041 }
      ];

      const sitesToShow = sites && sites.length > 0 ? sites : defaultSites;
      const center: [number, number] = sitesToShow.length > 0 
        ? [sitesToShow[0].lat, sitesToShow[0].lng]
        : [11.2447, 125.0041];

      // Initialize map only once
      if (!map.current) {
        map.current = L.map(mapContainer.current, {
          center: center,
          zoom: 13,
          zoomControl: false,
          attributionControl: false,
        });

        // Add tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(map.current);
      }

      // Clear existing markers
      if (map.current) {
        map.current.eachLayer((layer: any) => {
          if (layer instanceof L.Marker) {
            map.current!.removeLayer(layer);
          }
        });
      }

      // Add markers
      sitesToShow.forEach((site) => {
        if (map.current) {
          // Create marker with pulse effect
          const marker = L.circleMarker([site.lat, site.lng], {
            radius: 20,
            fillColor: '#7dd3c0',
            color: '#357d86',
            weight: 3,
            opacity: 0.8,
            fillOpacity: 0.7,
            className: 'pulse-marker'
          })
            .bindPopup(site.name)
            .addTo(map.current);

          // Add hover effects
          marker.on('mouseover', function(this: L.CircleMarker) {
            this.setStyle({
              radius: 25,
              weight: 4,
              fillOpacity: 0.9
            });
          });
          
          marker.on('mouseout', function(this: L.CircleMarker) {
            this.setStyle({
              radius: 20,
              weight: 3,
              fillOpacity: 0.7
            });
          });
        }
      });
    } catch (error) {
      console.error('Map initialization error:', error);
    }

    return () => {
      // Cleanup handled by component unmount
    };
  }, [sites]);

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
}
