'use client';

import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../../lib/google-maps-loader';

interface LiveTrackingMapProps {
  pickupLocation: { lat: number; lng: number; address: string };
  destinationLocation: { lat: number; lng: number; address: string };
  driverLocation?: { lat: number; lng: number };
  bookingStatus: string;
  onMapReady?: () => void;
}

export default function LiveTrackingMap({ 
  pickupLocation, 
  destinationLocation,
  driverLocation,
  bookingStatus,
  onMapReady
}: LiveTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
  } | null>(null);

  useEffect(() => {
    const initializeMap = async () => {
      if (!mapRef.current) return;

      try {
        await loadGoogleMaps({ libraries: ['geometry'] });
        createMap();
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Kunde inte ladda Google Maps. Kontrollera API-nyckeln.');
        setLoading(false);
      }
    };

    const createMap = () => {
      if (!mapRef.current || !window.google) return;

      try {
        // Create map using official Google Maps API
        const mapInstance = new window.google.maps.Map(mapRef.current, {
          center: pickupLocation,
          zoom: 13,
          styles: [
            {
              featureType: 'all',
              elementType: 'geometry.fill',
              stylers: [{ color: '#1a1a1a' }]
            },
            {
              featureType: 'water',
              elementType: 'geometry.fill',
              stylers: [{ color: '#0f172a' }]
            },
            {
              featureType: 'road',
              elementType: 'geometry.fill',
              stylers: [{ color: '#374151' }]
            },
            {
              featureType: 'poi',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#9ca3af' }]
            }
          ]
        });

        // Initialize directions service and renderer using official API
        const directionsServiceInstance = new window.google.maps.DirectionsService();
        const directionsRendererInstance = new window.google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#3b82f6',
            strokeWeight: 4,
            strokeOpacity: 0.8
          }
        });

        directionsRendererInstance.setMap(mapInstance);

        // Add markers using official API
        const pickupMarker = new window.google.maps.Marker({
          position: pickupLocation,
          map: mapInstance,
          title: 'Upphämtning',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
                <path d="M12 6v6l4 2" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(24, 24),
            anchor: new window.google.maps.Point(12, 12)
          }
        });

        const destinationMarker = new window.google.maps.Marker({
          position: destinationLocation,
          map: mapInstance,
          title: 'Destination',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#ffffff"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(24, 24),
            anchor: new window.google.maps.Point(12, 12)
          }
        });

        // Add driver marker if available
        if (driverLocation) {
          const driverMarker = new window.google.maps.Marker({
            position: driverLocation,
            map: mapInstance,
            title: 'Förare',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
                  <path d="M12 2a3 3 0 0 1 3 3c0 1.5-1.5 3-3 3s-3-1.5-3-3a3 3 0 0 1 3-3z" fill="#ffffff"/>
                  <path d="M12 8c-2.5 0-4.5 2-4.5 4.5v3h9v-3c0-2.5-2-4.5-4.5-4.5z" fill="#ffffff"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(24, 24),
              anchor: new window.google.maps.Point(12, 12)
            }
          });
        }

        // Calculate route using official Directions API
        if (directionsServiceInstance) {
          directionsServiceInstance.route({
            origin: pickupLocation,
            destination: destinationLocation,
            travelMode: window.google.maps.TravelMode.DRIVING,
            avoidHighways: false,
            avoidTolls: false
          }, (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK && result) {
              directionsRendererInstance.setDirections(result);
              
              const route = result.routes[0];
              const leg = route.legs[0];
              
              setRouteInfo({
                distance: leg.distance.text,
                duration: leg.duration.text
              });
            }
          });
        }

        if (onMapReady) {
          onMapReady();
        }

        setLoading(false);
      } catch (err) {
        console.error('Error creating map:', err);
        setError('Kunde inte skapa karta.');
        setLoading(false);
      }
    };

    initializeMap();
  }, [pickupLocation, destinationLocation, driverLocation, onMapReady]);

  if (loading) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Laddar karta...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-96 bg-red-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">❌ {error}</p>
          <p className="text-sm text-gray-600">Kontrollera att Google Maps API-nyckeln är korrekt konfigurerad.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div ref={mapRef} className="w-full h-96 rounded-lg shadow-lg" />
      
      {routeInfo && (
        <div className="mt-4 p-4 bg-white rounded-lg shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-2">Ruttinformation</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Avstånd:</span>
              <span className="ml-2 font-medium">{routeInfo.distance}</span>
            </div>
            <div>
              <span className="text-gray-600">Tid:</span>
              <span className="ml-2 font-medium">{routeInfo.duration}</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-4 p-4 bg-white rounded-lg shadow-sm border">
        <h3 className="font-semibold text-gray-900 mb-2">Bokningsstatus</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            bookingStatus === 'confirmed' ? 'bg-green-500' :
            bookingStatus === 'in_progress' ? 'bg-blue-500' :
            bookingStatus === 'completed' ? 'bg-gray-500' :
            'bg-yellow-500'
          }`}></div>
          <span className="text-sm text-gray-700 capitalize">
            {bookingStatus === 'confirmed' ? 'Bekräftad' :
             bookingStatus === 'in_progress' ? 'Pågår' :
             bookingStatus === 'completed' ? 'Slutförd' :
             'Väntar'}
          </span>
        </div>
      </div>
    </div>
  );
}