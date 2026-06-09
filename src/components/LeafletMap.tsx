import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Shop {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  services: string[];
  distance?: string;
}

interface LeafletMapProps {
  shops: Shop[];
  center?: [number, number];
  zoom?: number;
  className?: string;
}

const LeafletMap: React.FC<LeafletMapProps> = ({ 
  shops, 
  center = [33.7490, -84.3880], // Atlanta, GA
  zoom = 10,
  className = "h-64 w-full rounded-lg"
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView(center, zoom);
    mapInstanceRef.current = map;

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Add shop markers
    shops.forEach(shop => {
      const marker = L.marker([shop.lat, shop.lng]).addTo(map);
      
      const popupContent = `
        <div class="p-2">
          <h3 class="font-semibold text-lg">${shop.name}</h3>
          <p class="text-sm text-gray-600 mb-2">${shop.address}</p>
          ${shop.phone ? `<p class="text-sm text-blue-600 mb-2">${shop.phone}</p>` : ''}
          ${shop.distance ? `<p class="text-sm text-green-600">${shop.distance} away</p>` : ''}
          <div class="mt-2">
            <p class="text-xs font-medium">Services:</p>
            <p class="text-xs">${shop.services.join(', ')}</p>
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent);
    });

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [shops, center, zoom]);

  return <div ref={mapRef} className={className} />;
};

export default LeafletMap;
