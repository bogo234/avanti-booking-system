// Lightweight Google Maps JavaScript API loader with library support
// Ensures a single script load and resolves when the API is ready

declare global {
  interface Window {
    google?: typeof google;
    __googleMapsLoadResolver?: () => void;
    __googleMapsLoadPromise?: Promise<typeof google>;
  }
}

interface LoadOptions {
  libraries?: Array<'places' | 'geometry' | 'drawing' | 'visualization'>;
  language?: string;
  region?: string;
}

const DEFAULT_OPTIONS: Required<LoadOptions> = {
  libraries: ['places', 'geometry'],
  language: 'sv',
  region: 'SE',
};

export async function loadGoogleMaps(options: LoadOptions = {}): Promise<typeof google> {
  const { libraries, language, region } = { ...DEFAULT_OPTIONS, ...options };

  if (typeof window === 'undefined') {
    throw new Error('Google Maps can only be loaded in the browser');
  }

  // If already available, return immediately
  if (window.google && window.google.maps) {
    return window.google as typeof google;
  }

  // Reuse global promise if already loading
  if (window.__googleMapsLoadPromise) {
    return window.__googleMapsLoadPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing');
  }

  window.__googleMapsLoadPromise = new Promise<typeof google>((resolve, reject) => {
    try {
      const script = document.createElement('script');
      const params = new URLSearchParams({
        key: apiKey,
        libraries: libraries.join(','),
        language,
        region,
        v: 'weekly',
      });
      // Use onload event; no callback clutter in global scope
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        if (window.google && window.google.maps) {
          resolve(window.google as typeof google);
        } else {
          reject(new Error('Google Maps API loaded but window.google.maps is undefined'));
        }
      };

      script.onerror = () => reject(new Error('Failed to load Google Maps script'));

      document.head.appendChild(script);
    } catch (error) {
      reject(error as Error);
    }
  });

  return window.__googleMapsLoadPromise;
}

export function ensurePlacesLibraryLoaded(): void {
  if (!window.google || !window.google.maps || !window.google.maps.places) {
    throw new Error('Google Maps Places library is not loaded');
  }
}


