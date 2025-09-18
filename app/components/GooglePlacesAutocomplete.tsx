"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { loadGoogleMaps, ensurePlacesLibraryLoaded } from "../../lib/google-maps-loader";

interface PlaceDetails {
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface GooglePlacesAutocompleteProps {
  placeholder: string;
  value: string;
  onChange: (value: string, details?: PlaceDetails) => void;
  className?: string;
  style?: React.CSSProperties;
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  coordinates?: Coordinates;
}

export default function GooglePlacesAutocomplete({
  placeholder,
  value,
  onChange,
  className,
  style,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoaded, setIsLoaded] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overlayRect, setOverlayRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const updateOverlayPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setOverlayRect({ top: rect.bottom + 2, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    if (!showSuggestions) return;
    updateOverlayPosition();
    const onScrollOrResize = () => updateOverlayPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [showSuggestions, updateOverlayPosition]);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!input.trim() || input.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      await loadGoogleMaps();
      ensurePlacesLibraryLoaded();

      // Use modern AutocompleteSuggestion API when available, fallback otherwise
      const anyMaps: any = window.google!.maps;
      if (anyMaps.places && anyMaps.places.AutocompleteSuggestion) {
        const sessionToken = new anyMaps.places.AutocompleteSessionToken();
        const controller = new AbortController();
        const suggestionService = new anyMaps.places.AutocompleteSuggestion();
        suggestionService
          .getSuggestions({
            input,
            locationBias: undefined,
            language: 'sv',
            region: 'SE',
            sessionToken,
            types: ['geocode', 'establishment'],
            componentRestrictions: { country: ['se'] },
            signal: controller.signal,
          })
          .then((result: any) => {
            const suggestions = result.suggestions || [];
            const mapped: PlacePrediction[] = suggestions.map((s: any) => ({
              place_id: s.placeId,
              description: s.formattedText?.text || s.query || '',
              structured_formatting: {
                main_text: s.title?.text || s.query || '',
                secondary_text: s.subtitle?.text || '',
              },
            }));
            setSuggestions(mapped);
            setError(null);
          })
          .catch((e: any) => {
            console.error('Suggestion error:', e);
            setSuggestions([]);
          });
      } else {
        const service = new window.google!.maps.places.AutocompleteService();
        const sessionToken = new window.google!.maps.places.AutocompleteSessionToken();
        service.getPlacePredictions(
          {
            input,
            language: 'sv',
            componentRestrictions: { country: 'se' },
            sessionToken,
          },
          (predictions, status) => {
            if (status !== window.google!.maps.places.PlacesServiceStatus.OK || !predictions) {
              setSuggestions([]);
              return;
            }
            const mapped: PlacePrediction[] = predictions.map((p) => ({
              place_id: p.place_id!,
              description: p.description!,
              structured_formatting: {
                main_text: p.structured_formatting?.main_text || p.description || '',
                secondary_text: p.structured_formatting?.secondary_text || '',
              },
            }));
            setSuggestions(mapped);
            setError(null);
          }
        );
      }
    } catch (err: any) {
      console.error("Error fetching suggestions:", err);
      setError(err.message || "Kunde inte hämta adressförslag");
      setSuggestions([]);
    }
  }, []);

  // Hämta platsdetaljer inkl. koordinater via PlacesService (klientbiblioteket)
  const getPlaceDetails = useCallback(async (placeId: string): Promise<PlaceDetails | null> => {
    try {
      await loadGoogleMaps();
      ensurePlacesLibraryLoaded();
      const mapDiv = document.createElement('div');
      const map = new window.google!.maps.Map(mapDiv);
      const places = new window.google!.maps.places.PlacesService(map);

      const result: PlaceDetails | null = await new Promise((resolve) => {
        places.getDetails({
          placeId,
          fields: ['formatted_address', 'geometry'],
        }, (place, status) => {
          if (status === window.google!.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
            resolve({
              address: place.formatted_address || '',
              coordinates: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              },
            });
          } else {
            resolve(null);
          }
        });
      });

      return result;
    } catch (err) {
      console.error('Error fetching place details:', err);
      return null;
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);
    
    if (inputValue.trim().length >= 2) {
      fetchSuggestions(inputValue);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [onChange, fetchSuggestions]);

  const handleSuggestionClick = useCallback(async (suggestion: PlacePrediction) => {
    setShowSuggestions(false);
    setSuggestions([]);

    const details = await getPlaceDetails(suggestion.place_id);
    onChange(suggestion.description, details || undefined);
  }, [onChange, getPlaceDetails]);

  const handleInputFocus = useCallback(() => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [suggestions.length]);

  const handleInputBlur = useCallback(() => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowSuggestions(false), 200);
  }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className={className}
        style={style}
        disabled={!isLoaded}
      />
      
      {error && (
        <div className="text-red-500 text-xs mt-1">
          {error}
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && overlayRect && (
        createPortal(
          <div
            className="absolute z-50 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
            style={{
              top: overlayRect.top,
              left: overlayRect.left,
              width: overlayRect.width,
            }}
          >
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.place_id}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="font-medium text-gray-900">
                  {suggestion.structured_formatting.main_text}
                </div>
                <div className="text-sm text-gray-500">
                  {suggestion.structured_formatting.secondary_text}
                </div>
              </div>
            ))}
          </div>,
          document.body
        )
      )}
    </div>
  );
}