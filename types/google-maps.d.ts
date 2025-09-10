declare global {
  interface Window {
    google: typeof google;
    googleMapsLoaded?: boolean;
  }
}

declare namespace google.maps.places {
  interface Autocomplete {
    getPlace(): PlaceResult;
    addListener(event: string, handler: () => void): void;
  }

  interface PlaceResult {
    formatted_address?: string;
    name?: string;
    geometry?: {
      location?: google.maps.LatLng;
    };
  }

  interface AutocompletePrediction {
    description: string;
    place_id: string;
    structured_formatting?: {
      main_text: string;
      secondary_text: string;
    };
  }

  interface AutocompleteService {
    getPlacePredictions(
      request: AutocompleteRequest,
      callback: (predictions: AutocompletePrediction[] | null, status: PlacesServiceStatus) => void
    ): void;
  }

  interface PlacesService {
    getDetails(
      request: PlaceDetailsRequest,
      callback: (place: PlaceResult | null, status: PlacesServiceStatus) => void
    ): void;
  }

  interface AutocompleteRequest {
    input: string;
    componentRestrictions?: {
      country?: string | string[];
    };
    types?: string[];
  }

  interface PlaceDetailsRequest {
    placeId: string;
    fields: string[];
  }

  interface AutocompleteOptions {
    types?: string[];
    componentRestrictions?: {
      country?: string | string[];
    };
    fields?: string[];
  }

  enum PlacesServiceStatus {
    OK = 'OK',
    ZERO_RESULTS = 'ZERO_RESULTS',
    OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
    REQUEST_DENIED = 'REQUEST_DENIED',
    INVALID_REQUEST = 'INVALID_REQUEST',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
  }
}

declare namespace google.maps {
  interface LatLng {
    lat(): number;
    lng(): number;
  }

  namespace event {
    function clearInstanceListeners(instance: any): void;
  }

  namespace places {
    class Autocomplete {
      constructor(input: HTMLInputElement, opts?: AutocompleteOptions);
      getPlace(): PlaceResult;
      addListener(event: string, handler: () => void): void;
    }

    class AutocompleteService {
      constructor();
      getPlacePredictions(
        request: AutocompleteRequest,
        callback: (predictions: AutocompletePrediction[] | null, status: PlacesServiceStatus) => void
      ): void;
    }

    class PlacesService {
      constructor(attrContainer: HTMLDivElement);
      getDetails(
        request: PlaceDetailsRequest,
        callback: (place: PlaceResult | null, status: PlacesServiceStatus) => void
      ): void;
    }

    enum PlacesServiceStatus {
      OK = 'OK',
      ZERO_RESULTS = 'ZERO_RESULTS',
      OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
      REQUEST_DENIED = 'REQUEST_DENIED',
      INVALID_REQUEST = 'INVALID_REQUEST',
      UNKNOWN_ERROR = 'UNKNOWN_ERROR'
    }
  }
}

export {};