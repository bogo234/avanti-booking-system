'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface LiveTrackingMapProps {
  pickupLocation: { lat: number; lng: number; address: string };
  destinationLocation: { lat: number; lng: number; address: string };
  driverLocation?: { lat: number; lng: number };
  bookingStatus: string;
  onMapReady?: (map: any) => void;
}

export default function LiveTrackingMap({ 
  pickupLocation, 
  destinationLocation,
  driverLocation,
  bookingStatus,
  onMapReady
}: LiveTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [directionsService, setDirectionsService] = useState<any>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const initializeMap = async () => {
      if (!mapRef.current) return;

      try {
    const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: 'weekly',
      libraries: ['places', 'geometry']
    });

        const google = await loader.load();

        // Create map
        const mapInstance = new (window as any).google.maps.Map(mapRef.current, {
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

        // Initialize directions service and renderer
        const directionsServiceInstance = new (window as any).google.maps.DirectionsService();
        const directionsRendererInstance = new (window as any).google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#3b82f6',
            strokeWeight: 4,
            strokeOpacity: 0.8
          }
        });

        directionsRendererInstance.setMap(mapInstance);

        setMap(mapInstance);
        setDirectionsService(directionsServiceInstance);
        setDirectionsRenderer(directionsRendererInstance);

        if (onMapReady) {
          onMapReady(mapInstance);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Kunde inte ladda Google Maps. Kontrollera API-nyckeln.');
        setLoading(false);
      }
    };

    initializeMap();
  }, [pickupLocation, onMapReady]);

  useEffect(() => {
    if (!map || !directionsService || !directionsRenderer) return;

    // Add pickup marker
    const pickupMarker = new (window as any).google.maps.Marker({
      position: pickupLocation,
      map: map,
      title: 'Upphämtning',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
            <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">P</text>
          </svg>
        `),
        scaledSize: new (window as any).google.maps.Size(32, 32)
      }
    });

    // Add destination marker
    const destinationMarker = new (window as any).google.maps.Marker({
      position: destinationLocation,
      map: map,
      title: 'Destination',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
            <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">D</text>
          </svg>
        `),
        scaledSize: new (window as any).google.maps.Size(32, 32)
      }
    });

    // Add driver marker if location is available
    let driverMarker: any = null;
    if (driverLocation) {
      driverMarker = new (window as any).google.maps.Marker({
        position: driverLocation,
      map: map,
        title: 'Din förare',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">🚗</text>
          </svg>
        `),
          scaledSize: new (window as any).google.maps.Size(32, 32)
        }
      });
    }

    // Calculate and display route
    const calculateRoute = () => {
      const request: any = {
        origin: pickupLocation,
        destination: destinationLocation,
        travelMode: (window as any).google.maps.TravelMode.DRIVING,
        avoidHighways: false,
        avoidTolls: false
      };

      directionsService.route(request, (result, status) => {
        if (status === 'OK' && result) {
          directionsRenderer.setDirections(result);
          
          // Fit map to show entire route
          const bounds = new (window as any).google.maps.LatLngBounds();
          result.routes[0].legs.forEach(leg => {
            bounds.extend(leg.start_location);
            bounds.extend(leg.end_location);
          });
          map.fitBounds(bounds);
        }
      });
    };

    calculateRoute();

    // Update driver location periodically (simulate real-time updates)
    const updateDriverLocation = () => {
      if (driverLocation && driverMarker) {
        // Simulate driver movement along route
        const newLocation = {
          lat: driverLocation.lat + (Math.random() - 0.5) * 0.001,
          lng: driverLocation.lng + (Math.random() - 0.5) * 0.001
        };
        
        driverMarker.setPosition(newLocation);
      }
    };

    const interval = setInterval(updateDriverLocation, 3000);

    return () => {
      clearInterval(interval);
      if (pickupMarker) pickupMarker.setMap(null);
      if (destinationMarker) destinationMarker.setMap(null);
      if (driverMarker) driverMarker.setMap(null);
    };
  }, [map, directionsService, directionsRenderer, pickupLocation, destinationLocation, driverLocation]);

  if (loading) {
    return (
      <div className="map-loading">
        <div className="loading-spinner"></div>
        <p>Laddar karta...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-error">
        <p>❌ {error}</p>
        <button onClick={() => window.location.reload()}>
          Försök igen
        </button>
      </div>
    );
  }

  return (
    <div className="live-tracking-map">
      <div ref={mapRef} className="map-container" />
      
      <div className="map-info">
        <div className="info-item">
          <span className="info-label">Status:</span>
          <span className="info-value">{bookingStatus}</span>
        </div>
        {driverLocation && (
          <div className="info-item">
            <span className="info-label">Förare:</span>
            <span className="info-value">På plats</span>
          </div>
        )}
          </div>
          
      <style jsx>{`
        .live-tracking-map {
          width: 100%;
          height: 400px;
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          background: #1a1a1a;
        }

        .map-container {
          width: 100%;
          height: 100%;
        }

        .map-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          background: #1a1a1a;
          color: white;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .map-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          background: #1a1a1a;
          color: #ef4444;
          text-align: center;
          padding: 2rem;
        }

        .map-error button {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .map-info {
          position: absolute;
          top: 1rem;
          left: 1rem;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 1rem;
          border-radius: 8px;
          backdrop-filter: blur(10px);
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .info-item:last-child {
          margin-bottom: 0;
        }

        .info-label {
          font-weight: 600;
          margin-right: 1rem;
        }

        .info-value {
          color: #10b981;
        }

        @media (max-width: 768px) {
          .live-tracking-map {
            height: 300px;
          }
          
          .map-info {
            position: relative;
            top: 0;
            left: 0;
            margin: 1rem;
            background: rgba(0, 0, 0, 0.9);
          }
        }
      `}</style>
    </div>
  );
}