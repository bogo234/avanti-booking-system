'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface GooglePlacesAutocompleteProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function GooglePlacesAutocomplete({
  placeholder,
  value,
  onChange,
  className,
  style
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        setError(null);
        
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();
        
        if (inputRef.current) {
          autocompleteRef.current = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
            types: ['address'],
            componentRestrictions: { country: 'se' },
            fields: ['formatted_address', 'geometry']
          });

          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current?.getPlace();
            if (place?.formatted_address) {
              onChange(place.formatted_address);
            }
          });

          setIsLoaded(true);
        }
      } catch (err: any) {
        console.error('Google Maps API Error:', err);
        setError('Google Maps API kunde inte laddas. Kontrollera att Places API är aktiverat.');
        setIsLoaded(false);
      }
    };

    initializeGoogleMaps();

    return () => {
      if (autocompleteRef.current) {
        (window as any).google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onChange]);

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        style={style}
        disabled={false}
      />
      {error && (
        <div style={{
          color: '#ef4444',
          fontSize: '12px',
          marginTop: '4px'
        }}>
          {error}
        </div>
      )}
      {!isLoaded && !error && (
        <div style={{
          color: '#f59e0b',
          fontSize: '12px',
          marginTop: '4px'
        }}>
          Laddar Google Maps API...
        </div>
      )}
    </div>
  );
}