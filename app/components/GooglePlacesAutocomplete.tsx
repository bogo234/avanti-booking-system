"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Loader } from "@googlemaps/js-api-loader";

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

export default function GooglePlacesAutocomplete({
  placeholder,
  value,
  onChange,
  className,
  style,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlayRect, setOverlayRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const updateOverlayPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setOverlayRect({ top: rect.bottom + 2, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        setError(null);
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          version: "weekly",
          libraries: ["places"],
          language: "sv",
          region: "SE",
        });
        await loader.load();
        if (window.google && window.google.maps) {
          autocompleteService.current = new window.google.maps.places.AutocompleteService();
          const mapDiv = document.createElement("div");
          placesService.current = new window.google.maps.places.PlacesService(mapDiv);
          setIsLoaded(true);
        }
      } catch (err: any) {
        setError(
          "Google Maps API kunde inte laddas. Kontrollera din internetanslutning och att Places API är aktiverat."
        );
        setIsLoaded(false);
      }
    };
    initializeGoogleMaps();
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

  function ensureSessionToken() {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
    return sessionTokenRef.current;
  }

  function clearSessionToken() {
    sessionTokenRef.current = null;
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const inputValue = e.target.value;
    onChange(inputValue, { address: inputValue });

    if (!isLoaded || !autocompleteService.current) return;

    if (inputValue.trim().length >= 1) {
      updateOverlayPosition();
      const sessionToken = ensureSessionToken();
      autocompleteService.current.getPlacePredictions(
        {
          input: inputValue,
          componentRestrictions: { country: "se" },
          sessionToken,
          types: ["address"],
        },
        (predictions, status) => {
          if (
            (status === google.maps.places.PlacesServiceStatus.OK ||
              status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) &&
            Array.isArray(predictions)
          ) {
            setSuggestions(predictions);
            setShowSuggestions(predictions.length > 0);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        }
      );
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  function handleSuggestionClick(prediction: google.maps.places.AutocompletePrediction) {
    if (!placesService.current) return;
    const sessionToken = ensureSessionToken();
    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["formatted_address", "geometry", "name"],
        sessionToken,
      } as any,
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const formatted = place.formatted_address || prediction.description;
          const coordinates = place.geometry?.location
            ? {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              }
            : undefined;
          onChange(formatted, { address: formatted, coordinates });
          setShowSuggestions(false);
          clearSessionToken();
        }
      }
    );
  }

  function handleFocus() {
    if (suggestions.length > 0 && isLoaded) {
      updateOverlayPosition();
      setShowSuggestions(true);
    }
  }

  function handleBlur() {
    setTimeout(() => setShowSuggestions(false), 200);
  }

  const inputNode = (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleInputChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={
        className ||
        "w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all normal-case"
      }
      style={{ ...(style || {}), textTransform: "none" }}
      autoComplete="off"
      inputMode="search"
    />
  );

  const suggestionsList = (
    <div
      style={{
        position: "fixed",
        top: overlayRect?.top ?? 0,
        left: overlayRect?.left ?? 0,
        width: overlayRect?.width ?? undefined,
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "0.5rem",
        marginTop: 2,
        maxHeight: 320,
        overflowY: "auto",
        zIndex: 2147483647,
        boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={suggestion.place_id}
          onClick={() => handleSuggestionClick(suggestion)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            cursor: "pointer",
            color: "#1f2937",
            borderBottom: index < suggestions.length - 1 ? "1px solid #e5e7eb" : "none",
            transition: "background-color 0.15s ease",
            textTransform: "none",
            lineHeight: 1.35,
            whiteSpace: "normal",
            wordBreak: "break-word",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.backgroundColor = "#f3f4f6";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="#9CA3AF"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flex: "0 0 auto" }}
          >
            <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
          </svg>
          <span style={{ textTransform: "none" }}>{suggestion.description}</span>
        </div>
      ))}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "6px 10px",
          fontSize: 10,
          color: "#6B7280",
          borderTop: suggestions.length ? "1px solid #e5e7eb" : "none",
          backgroundColor: "#fff",
          textTransform: "none",
        }}
      >
        powered by <span style={{ marginLeft: 4, fontWeight: 600, color: "#4285F4" }}>Google</span>
      </div>
    </div>
  );

  return (
    <div className="relative w-full">
      {inputNode}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
      {!isLoaded && !error && (
        <div className="text-amber-500 text-xs mt-1">Laddar Google Maps API...</div>
      )}
      {showSuggestions && suggestions.length > 0 && isLoaded && overlayRect &&
        createPortal(suggestionsList, document.body)}
    </div>
  );
}