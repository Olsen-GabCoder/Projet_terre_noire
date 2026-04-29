/**
 * LocationMap — Carte OpenStreetMap réutilisable via Leaflet
 * Props:
 *   lat, lng — coordonnées du point central
 *   zoom — niveau de zoom (défaut 14)
 *   markers — [{lat, lng, label, link?}] marqueurs additionnels
 *   height — hauteur CSS (défaut '250px')
 *   className — classe CSS additionnelle
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix icônes Leaflet (webpack/vite cassent les chemins par défaut)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const LocationMap = ({ lat, lng, zoom = 14, markers = [], height = '250px', className = '' }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current || (!lat && !markers.length)) return;

    // Si la carte existe déjà, la détruire pour recréer
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const centerLat = lat || (markers[0]?.lat) || 0;
    const centerLng = lng || (markers[0]?.lng) || 0;

    const map = L.map(mapRef.current).setView([centerLat, centerLng], zoom);
    mapInstance.current = map;

    // Tuiles OpenStreetMap (gratuites)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Marqueur principal
    if (lat && lng) {
      L.marker([lat, lng]).addTo(map);
    }

    // Marqueurs additionnels
    markers.forEach(m => {
      if (m.lat && m.lng) {
        const marker = L.marker([m.lat, m.lng]).addTo(map);
        if (m.label) {
          marker.bindPopup(`<strong>${m.label}</strong>${m.address ? `<br/><small>${m.address}</small>` : ''}`);
        }
      }
    });

    // Si plusieurs marqueurs, ajuster les limites
    if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      if (lat && lng) bounds.extend([lat, lng]);
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    // Forcer le redimensionnement après le rendu
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [lat, lng, zoom, markers]);

  if (!lat && !markers.length) return null;

  return (
    <div
      ref={mapRef}
      className={`location-map ${className}`}
      style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }}
    />
  );
};

export default LocationMap;
