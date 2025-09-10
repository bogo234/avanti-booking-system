declare global {
  interface Window {
    google: typeof google;
  }
}

declare namespace google.maps.places {
  interface Autocomplete {
    getPlace(): PlaceResult;
    addListener(event: string, handler: () => void): void;
  }

  interface PlaceResult {
    formatted_address?: string;
    geometry?: {
      location?: google.maps.LatLng;
    };
  }

  interface AutocompleteOptions {
    types?: string[];
    componentRestrictions?: {
      country?: string | string[];
    };
    fields?: string[];
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
  }
}

export {};
