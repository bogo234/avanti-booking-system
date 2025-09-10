'use client';

import { useState, useEffect, useRef } from 'react';

interface GoogleMapsAutocompleteProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: any) => void;
}


export default function GoogleMapsAutocomplete({ 
  placeholder, 
  value, 
  onChange, 
  onSelect 
}: GoogleMapsAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isApiAvailable, setIsApiAvailable] = useState(false);
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadGoogleMapsAPI = () => {
      if (window.google && window.google.maps) {
        initializeServices();
        return;
      }

      if (window.googleMapsLoaded) {
        const checkInterval = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkInterval);
            initializeServices();
          }
        }, 100);
        return;
      }

      window.googleMapsLoaded = true;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        try {
          initializeServices();
        } catch (error) {
          console.error('Google Maps API initialization failed:', error);
          setApiError('Google Maps API är inte tillgängligt');
          setIsApiAvailable(false);
        }
      };
      script.onerror = () => {
        window.googleMapsLoaded = false;
        console.error('Failed to load Google Maps API');
        setApiError('Kunde inte ladda Google Maps API');
        setIsApiAvailable(false);
      };
      document.head.appendChild(script);
    };

    loadGoogleMapsAPI();
  }, []);

  const initializeServices = () => {
    try {
      if (window.google && window.google.maps) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        if (inputRef.current) {
          const mapDiv = document.createElement('div');
          placesService.current = new window.google.maps.places.PlacesService(mapDiv);
        }
        setIsApiAvailable(true);
        setApiError(null);
      }
    } catch (error) {
      console.error('Failed to initialize Google Maps services:', error);
      setApiError('Google Maps API är inte tillgängligt');
      setIsApiAvailable(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);

    if (!isApiAvailable || !autocompleteService.current) {
      return;
    }

    if (inputValue.length > 2) {
      try {
        autocompleteService.current.getPlacePredictions(
          {
            input: inputValue,
            componentRestrictions: { country: 'se' },
            types: ['address']
          },
          (predictions, status) => {
            if (status === 'OK' && predictions) {
              setSuggestions(predictions);
              setShowSuggestions(true);
            } else if (status === 'REQUEST_DENIED') {
              setApiError('Google Maps API kräver billing aktivering');
              setIsApiAvailable(false);
            } else {
              setSuggestions([]);
              setShowSuggestions(false);
            }
          }
        );
      } catch (error) {
        console.error('Autocomplete request failed:', error);
        setApiError('Kunde inte hämta adressförslag');
        setIsApiAvailable(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (prediction: any) => {
    if (placesService.current) {
      try {
        placesService.current.getDetails(
          {
            placeId: prediction.place_id,
            fields: ['formatted_address', 'geometry', 'name']
          },
          (place, status) => {
            if (status === 'OK' && place) {
              onChange(place.formatted_address || prediction.description);
              onSelect(place);
              setShowSuggestions(false);
            }
          }
        );
      } catch (error) {
        console.error('Failed to get place details:', error);
        onChange(prediction.description);
        onSelect({ formatted_address: prediction.description } as any);
        setShowSuggestions(false);
      }
    }
  };

  const handleFocus = () => {
    if (suggestions.length > 0 && isApiAvailable) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleManualSubmit = () => {
    if (value.trim()) {
      const mockPlace: any = {
        formatted_address: value.trim(),
        name: value.trim()
      };
      onSelect(mockPlace);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleManualSubmit();
          }
        }}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          backgroundColor: '#1f2937',
          color: 'white',
          borderRadius: '0.5rem',
          border: '1px solid #374151',
          outline: 'none',
          fontSize: '1rem'
        }}
      />
      
      {apiError && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.5rem',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '0.25rem',
          fontSize: '0.875rem',
          color: '#fca5a5'
        }}>
          ⚠️ {apiError}. Du kan fortfarande skriva adresser manuellt.
        </div>
      )}
      
      {showSuggestions && suggestions.length > 0 && isApiAvailable && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '0.5rem',
          marginTop: '0.25rem',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 1000
        }}>
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.place_id}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                color: 'white',
                borderBottom: index < suggestions.length - 1 ? '1px solid #374151' : 'none',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {suggestion.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
