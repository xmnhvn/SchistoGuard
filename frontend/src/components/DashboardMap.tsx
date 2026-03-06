import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../styles/mapMarker.css';

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
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    const defaultSites = [
      { id: 'site-1', name: "Mang Jose's Fish Pond", lat: 11.2447, lng: 125.0041 }
    ];
    const sitesToShow = sites && sites.length > 0 ? sites : defaultSites;
    const center = sitesToShow[0];

    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        // Free vector tiles — no API key needed
        style: 'https://tiles.openfreemap.org/styles/positron',
        // Offset center westward so the site marker appears in the right portion of the map
        center: [center.lng - 0.060, center.lat],
        zoom: 12,
        attributionControl: false,
      });
    }

    // Remove old markers
    markers.current.forEach(m => m.remove());
    markers.current = [];

    const addMarkers = () => {
      sitesToShow.forEach((site) => {
        const el = document.createElement('div');
        el.innerHTML = `
          <div class="site-marker">
            <div class="site-marker__pulse"></div>
            <div class="site-marker__ring"></div>
            <div class="site-marker__dot"></div>
          </div>`;

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([site.lng, site.lat])
          .setPopup(new maplibregl.Popup({ offset: 12 }).setText(site.name))
          .addTo(map.current!);

        markers.current.push(marker);
      });
    };

    if (map.current.isStyleLoaded()) {
      addMarkers();
    } else {
      map.current.once('load', addMarkers);
    }

    return () => {
      markers.current.forEach(m => m.remove());
      markers.current = [];
    };
  }, [sites]);

  // Destroy map on unmount
  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
}
