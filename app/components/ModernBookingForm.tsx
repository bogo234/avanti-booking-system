'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';
import { BookingRequest, ServiceType, Address } from '../types/booking';
import { useAuth } from '../contexts/AuthContext';
import { calculatePrice } from '../../lib/geocoding';

interface ModernBookingFormProps {
  onBookingSubmit: (booking: BookingRequest) => void;
  isLoading?: boolean;
}

const MemoGooglePlacesAutocomplete = memo(GooglePlacesAutocomplete);

export default function ModernBookingForm({ onBookingSubmit, isLoading = false }: ModernBookingFormProps) {
  const { user, userRole } = useAuth();
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [pickupCoordinates, setPickupCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [destinationCoordinates, setDestinationCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [pickupDateTime, setPickupDateTime] = useState('');
  // Removed service selection - Avanti has one standard service
  const [licensePlate, setLicensePlate] = useState('');
  const [error, setError] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [step, setStep] = useState(1);
  const [isEditingAddresses, setIsEditingAddresses] = useState(false);
  const [isLoadingCoordinates, setIsLoadingCoordinates] = useState(false);
  const [coordinateError, setCoordinateError] = useState<string>('');

  // Generera kombinerade datum och tider (memoiserad för prestanda)
  const dateTimeOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const date = new Date(now);
      date.setDate(now.getDate() + dayOffset);
      let startHour = 6;
      let startMinuteSeed = 0;
      if (dayOffset === 0) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        let nextMinute = Math.ceil(currentMinute / 15) * 15;
        if (nextMinute >= 60) {
          startHour = currentHour + 1;
          nextMinute = 0;
        } else {
          startHour = currentHour;
        }
        startMinuteSeed = nextMinute;
        if (startHour > 22 || (startHour === 22 && nextMinute > 0)) continue;
      }
      for (let hour = startHour; hour <= 22; hour++) {
        const startMinute = (dayOffset === 0 && hour === startHour) ? startMinuteSeed : 0;
        for (let minute = startMinute; minute < 60; minute += 15) {
          const currentTime = new Date();
          const optionTime = new Date(date);
          optionTime.setHours(hour, minute, 0, 0);
          if (dayOffset === 0 && optionTime <= currentTime) continue;
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const dateTime = new Date(date);
          dateTime.setHours(hour, minute, 0, 0);
          const dateLabel = date.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' });
          options.push({ value: dateTime.toISOString(), label: `${dateLabel} ${timeString}` });
        }
      }
    }
    return options;
  }, []);

  const dateTimeOptionNodes = useMemo(() => (
    dateTimeOptions.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))
  ), [dateTimeOptions]);

  // Memoiserade handlers för att inte trigga onödiga omrenderingar i memo:ade barn
  const handlePickupChange = useCallback((address: string, details?: { coordinates?: { lat: number; lng: number } }) => {
    setPickupAddress(address);
    if (details?.coordinates) {
      setPickupCoordinates(details.coordinates);
      setCoordinateError('');
    }
  }, []);

  const handleDestinationChange = useCallback((address: string, details?: { coordinates?: { lat: number; lng: number } }) => {
    setDestinationAddress(address);
    if (details?.coordinates) {
      setDestinationCoordinates(details.coordinates);
      setCoordinateError('');
    }
  }, []);

  // Läs URL parameters och hämta koordinater automatiskt
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const pickupParam = urlParams.get('pickup');
      const destinationParam = urlParams.get('destination');
      
      const fetchCoordinatesForAddresses = async () => {
        if (pickupParam && destinationParam) {
          setIsLoadingCoordinates(true);
          setCoordinateError('');
          
          try {
            // Vänta tills Google Maps API är laddat
            await new Promise<void>((resolve) => {
              if ((window as any).google?.maps) {
                resolve();
              } else {
                const checkInterval = setInterval(() => {
                  if ((window as any).google?.maps) {
                    clearInterval(checkInterval);
                    resolve();
                  }
                }, 100);
                
                // Timeout efter 10 sekunder
                setTimeout(() => {
                  clearInterval(checkInterval);
                  resolve();
                }, 10000);
              }
            });
            
            const decodedPickup = decodeURIComponent(pickupParam);
            const decodedDestination = decodeURIComponent(destinationParam);
            
            setPickupAddress(decodedPickup);
            setDestinationAddress(decodedDestination);
            
            // Hämta koordinater från Google Geocoding API
            const { geocodeAddress } = await import('../../lib/geocoding');
            
            try {
              const [pickupCoords, destCoords] = await Promise.all([
                geocodeAddress(decodedPickup),
                geocodeAddress(decodedDestination)
              ]);
              
              setPickupCoordinates(pickupCoords);
              setDestinationCoordinates(destCoords);
              
              // Starta på steg 1 när koordinater är klara
              setStep(1);
            } catch (geocodeError) {
              console.error('Geocoding error:', geocodeError);
              setCoordinateError('Adresserna kunde inte verifieras automatiskt. Välj adresser från förslagslistan för att fortsätta.');
              // Sätt adresserna ändå så användaren kan välja från dropdown
              setStep(1);
            }
          } catch (error) {
            console.error('Error loading coordinates:', error);
            setCoordinateError('Ett fel uppstod vid laddning av adresser.');
          } finally {
            setIsLoadingCoordinates(false);
          }
        }
      };
      
      fetchCoordinatesForAddresses();
    }
  }, []);

  // Calculate price when coordinates change
  useEffect(() => {
    if (pickupCoordinates && destinationCoordinates) {
      setIsCalculatingPrice(true);
      try {
        const price = calculatePrice(pickupCoordinates, destinationCoordinates);
        setEstimatedPrice(price);
        setError(''); // Clear any previous errors
      } catch (error) {
        setError('Kunde inte beräkna pris. Kontrollera att adresserna är giltiga.');
        setEstimatedPrice(null);
      } finally {
        setIsCalculatingPrice(false);
      }
    } else {
      // Clear price if coordinates are missing
      setEstimatedPrice(null);
    }
  }, [pickupCoordinates, destinationCoordinates]);

  // Parse address from Google Places formatted_address
  const parseAddress = (formattedAddress: string): Address => {
    // Google Places returns addresses in various formats depending on the country and location
    // Swedish format examples:
    // - "Andra Långgatan 13, 413 28 Göteborg, Sverige"
    // - "Kungsgatan 1, Stockholm, Sverige"
    // - "Storgatan, 123 45 Stad, Sverige"
    
    if (!formattedAddress) {
      return {
        street: '',
        city: '',
        postalCode: '',
        country: 'Sverige'
      };
    }
    
    const parts = formattedAddress.split(',').map(part => part.trim()).filter(part => part.length > 0);
    
    // Initialize with empty values
    let street = '';
    let postalCode = '';
    let city = '';
    let country = '';
    
    if (parts.length === 0) {
      return {
        street: formattedAddress,
        city: '',
        postalCode: '',
        country: 'Sverige'
      };
    }
    
    // Always use the first part as street
    street = parts[0];
    
    // Determine country (last part if it looks like a country name)
    const lastPart = parts[parts.length - 1];
    const countryNames = ['Sverige', 'Sweden', 'SE'];
    if (parts.length > 1 && countryNames.some(cn => lastPart.toLowerCase().includes(cn.toLowerCase()))) {
      country = lastPart;
      parts.pop(); // Remove country from parts for further processing
    } else {
      country = 'Sverige'; // Default country
    }
    
    // Process remaining middle part(s) for city and postal code
    if (parts.length > 1) {
      const cityPart = parts[1]; // Second part typically contains postal code and city
      
      // Try to extract postal code (Swedish format: XXX XX)
      const postalMatch = cityPart.match(/\b(\d{3})\s?(\d{2})\b/);
      if (postalMatch) {
        postalCode = `${postalMatch[1]} ${postalMatch[2]}`;
        // Extract city name by removing postal code from the string
        city = cityPart.replace(postalMatch[0], '').trim();
        
        // If city is empty after removing postal code, check next part
        if (!city && parts.length > 2) {
          city = parts[2];
        }
      } else {
        // No postal code found, entire part is likely the city
        city = cityPart;
      }
    }
    
    // Clean up any remaining commas or extra spaces
    street = street.replace(/,$/, '').trim();
    city = city.replace(/^,|,$/g, '').trim();
    
    return {
      street: street || formattedAddress, // Fallback to full address if parsing fails
      city: city || '',
      postalCode: postalCode || '',
      country: country || 'Sverige'
    };
  };

  const handleSubmit = () => {
    if (!canProceed()) return;

    if (!user) {
      setError('Du måste vara inloggad för att göra en bokning');
      return;
    }

    if (!pickupCoordinates || !destinationCoordinates) {
      setError('Välj giltiga adresser från förslagens-listan för att få exakta koordinater');
      return;
    }

    if (!estimatedPrice) {
      setError('Pris kunde inte beräknas. Kontrollera att adresserna är giltiga.');
      return;
    }

    if (!pickupAddress.trim() || !destinationAddress.trim()) {
      setError('Både upphämtnings- och destinationsadress krävs');
      return;
    }

    if (!licensePlate.trim()) {
      setError('Registreringsnummer krävs');
      return;
    }

    const parsedPickupAddress = parseAddress(pickupAddress);
    const parsedDestinationAddress = parseAddress(destinationAddress);
    
    const booking: BookingRequest = {
      customerId: user.uid,
      pickupLocation: {
        ...parsedPickupAddress,
        coordinates: pickupCoordinates // Real coordinates from Google Places API
      },
      destination: {
        ...parsedDestinationAddress,
        coordinates: destinationCoordinates // Real coordinates from Google Places API
      },
      pickupTime: new Date(pickupDateTime),
      serviceTypeId: 'standard', // Avanti has one standard service
      licensePlate,
      termsAccepted,
      privacyAccepted,
      estimatedPrice: estimatedPrice
    };

    onBookingSubmit(booking);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        // Visa tydligt vad som saknas
        if (!pickupCoordinates || !destinationCoordinates) {
          return false; // Koordinater krävs
        }
        if (!pickupDateTime) {
          return false; // Tid krävs
        }
        if (!licensePlate) {
          return false; // Registreringsnummer krävs
        }
        if (!estimatedPrice) {
          return false; // Pris måste beräknas
        }
        return true;
      case 2:
        return termsAccepted && privacyAccepted;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (canProceed() && step < 2) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="modern-booking-form">
      {/* Progress Indicator */}
      <div className="progress-indicator">
        <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
          <span className="step-number">1</span>
          <span className="step-label">Detaljer</span>
        </div>
        <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-label">Bekräfta</span>
        </div>
      </div>
      

      {/* Loading indicator för koordinater */}
      {isLoadingCoordinates && (
        <div className="coordinate-loading">
          <div className="loading-spinner"></div>
          <p>Laddar adressinformation...</p>
        </div>
      )}
      

      {/* Step 1: Service and Time Selection */}
      {step === 1 && !isLoadingCoordinates && (
        <div className="booking-step">
          <h3 className="step-title" style={{textTransform: 'none'}}>Resa</h3>
          
          {/* Visa adresser om de finns */}
          {(pickupAddress || destinationAddress) && !isEditingAddresses && (
            <div className="address-summary">
              <div className="address-item">
                <span className="address-label">Från:</span>
                <span className="address-value">{pickupAddress}</span>
              </div>
              <div className="address-item">
                <span className="address-label">Till:</span>
                <span className="address-value">{destinationAddress}</span>
              </div>
              <button 
                type="button"
                onClick={() => setIsEditingAddresses(true)}
                className="edit-address-btn"
              >
                {(!pickupCoordinates || !destinationCoordinates) ? 'Välj adresser från listan' : 'Redigera adresser'}
              </button>
            </div>
          )}

          {/* Adressredigeringsfält - Visa alltid om koordinater saknas */}
          {(isEditingAddresses || !pickupCoordinates || !destinationCoordinates) && (
            <div className="address-edit-form">
              
              <div className="input-group">
                <label>
                  Från
                  {!pickupCoordinates && <span className="required-indicator">*</span>}
                </label>
                <MemoGooglePlacesAutocomplete
                  value={pickupAddress}
                  onChange={handlePickupChange}
                  placeholder="Ange upphämtningsplats"
                  className="modern-input"
                />
              </div>
              
              <div className="input-group">
                <label>
                  Till
                  {!destinationCoordinates && <span className="required-indicator">*</span>}
                </label>
                <MemoGooglePlacesAutocomplete
                  value={destinationAddress}
                  onChange={handleDestinationChange}
                  placeholder="Ange destination"
                  className="modern-input"
                />
              </div>
              
              {pickupCoordinates && destinationCoordinates && (
                <div className="address-edit-actions">
                  <button 
                    type="button"
                    className="modern-button secondary"
                    onClick={() => setIsEditingAddresses(false)}
                  >
                    Avbryt
                  </button>
                  <button 
                    type="button"
                    className="modern-button primary"
                    onClick={() => setIsEditingAddresses(false)}
                  >
                    Spara ändringar
                  </button>
                </div>
              )}
            </div>
          )}
          
          <div className="form-row">
            <div className="input-group">
              <label>Tid</label>
              <select
                value={pickupDateTime}
                onChange={(e) => setPickupDateTime(e.target.value)}
                className="modern-input"
                required
              >
                <option value="">Välj datum och tid</option>
                {dateTimeOptionNodes}
              </select>
            </div>

            <div className="input-group">
              <label>Bil</label>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                placeholder="ABC 123"
                className="modern-input"
                maxLength={8}
                required
              />
            </div>
          </div>


          {/* Service Information - Avanti has one standard service */}
          <div className="service-info">
            <h3>Avanti Biltransport</h3>
            <p>Professionell chaufför kör din bil från A till B</p>
            
            <div className="pricing-info">
              <div className="price-display">
                {isCalculatingPrice ? (
                  <div className="calculating">
                    <span className="spinner"></span>
                    Beräknar pris...
                  </div>
                ) : estimatedPrice ? (
                  <div className="price-result">
                    <span className="price">{estimatedPrice} kr</span>
                    <span className="price-breakdown">
                      299 kr bas + 15 kr/km efter 5 km
                    </span>
                  </div>
                ) : (
                  <div className="price-pending">
                    Välj adresser för att se pris
                  </div>
                )}
              </div>
            </div>
          </div>

          <style jsx>{`
            .service-info {
              background: rgba(255, 255, 255, 0.05);
              border-radius: 12px;
              padding: 1.5rem;
              margin: 1rem 0;
              border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .service-info h3 {
              margin: 0 0 0.5rem 0;
              color: white;
              font-size: 1.25rem;
              font-weight: 600;
            }

            .service-info p {
              margin: 0 0 1rem 0;
              color: rgba(255, 255, 255, 0.8);
              font-size: 0.875rem;
            }

            .price-display {
              text-align: center;
              padding: 1rem;
            }

            .calculating {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 0.5rem;
              color: #f59e0b;
              font-weight: 500;
            }

            .spinner {
              width: 16px;
              height: 16px;
              border: 2px solid rgba(245, 158, 11, 0.3);
              border-top: 2px solid #f59e0b;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }

            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }

            .price-result {
              text-align: center;
            }

            .price {
              display: block;
              font-size: 2rem;
              font-weight: 700;
              color: #10b981;
              margin-bottom: 0.5rem;
            }

            .price-breakdown {
              display: block;
              font-size: 0.75rem;
              color: rgba(255, 255, 255, 0.6);
            }

            .price-pending {
              color: rgba(255, 255, 255, 0.6);
              font-style: italic;
            }
          `}</style>

          <div className="step-actions">
            <button 
              onClick={nextStep}
              disabled={!canProceed()}
              className="modern-button primary next-button"
            >
              Nästa
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Confirmation and Legal */}
      {step === 2 && (
        <div className="booking-step">
          <h3 className="step-title">Bekräfta</h3>
          
          <div className="booking-summary">
            <div className="summary-item">
              <span>Från:</span>
              <span>{pickupAddress}</span>
            </div>
            <div className="summary-item">
              <span>Till:</span>
              <span>{destinationAddress}</span>
            </div>
            <div className="summary-item">
              <span>Tid:</span>
              <span>{pickupDateTime ? new Date(pickupDateTime).toLocaleString('sv-SE') : ''}</span>
            </div>
            <div className="summary-item">
              <span>Service:</span>
              <span>Avanti Biltransport</span>
            </div>
            <div className="summary-item">
              <span>Pris:</span>
              <span>{estimatedPrice ? `${estimatedPrice} kr` : 'Beräknas...'}</span>
            </div>
            <div className="summary-item">
              <span>Bil:</span>
              <span>{licensePlate}</span>
            </div>
          </div>

          <div className="legal-section">
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="modern-checkbox"
                />
                <span>Jag accepterar <a href="/villkor" target="_blank">villkoren</a></span>
              </label>
            </div>
            
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="modern-checkbox"
                />
                <span>Jag accepterar <a href="/integritet" target="_blank">integritetspolicyn</a></span>
              </label>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="button-group">
            <button onClick={prevStep} className="modern-button secondary">
              Tillbaka
            </button>
            <button 
              onClick={handleSubmit}
              disabled={!canProceed() || isLoading}
              className="modern-button primary"
            >
              {isLoading ? 'Bokar...' : 'Bekräfta bokning'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

