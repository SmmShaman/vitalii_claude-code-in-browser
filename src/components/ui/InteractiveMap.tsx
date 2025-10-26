import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AUTHOR_LOCATION } from '../../utils/footerApi';
import type { UserLocation } from '../../utils/footerApi';

// Fix for default marker icons in Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface InteractiveMapProps {
  userLocation: UserLocation | null;
  className?: string;
}

export const InteractiveMap = ({ userLocation, className = '' }: InteractiveMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      });

      // Add dark theme tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Create custom icons
    const authorIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: bold;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          Я
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const userIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: bold;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          Ти
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    // Add author marker
    const authorMarker = L.marker([AUTHOR_LOCATION.latitude, AUTHOR_LOCATION.longitude], {
      icon: authorIcon,
    }).addTo(map);
    authorMarker.bindPopup(`<b>${AUTHOR_LOCATION.name}</b>`);

    // Add user marker if location is available
    if (userLocation) {
      const userMarker = L.marker([userLocation.latitude, userLocation.longitude], {
        icon: userIcon,
      }).addTo(map);
      userMarker.bindPopup(`<b>${userLocation.city}, ${userLocation.country}</b>`);

      // Fit map bounds to show both markers
      const bounds = L.latLngBounds([
        [AUTHOR_LOCATION.latitude, AUTHOR_LOCATION.longitude],
        [userLocation.latitude, userLocation.longitude],
      ]);
      map.fitBounds(bounds, { padding: [20, 20] });
    } else {
      // Center on author location if no user location
      map.setView([AUTHOR_LOCATION.latitude, AUTHOR_LOCATION.longitude], 4);
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [userLocation]);

  return (
    <div
      ref={mapRef}
      className={`rounded-lg overflow-hidden shadow-lg ${className}`}
      style={{ minHeight: '200px' }}
    />
  );
};
