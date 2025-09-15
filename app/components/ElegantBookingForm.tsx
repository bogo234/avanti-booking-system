'use client';

import { useState, useEffect } from 'react';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';
import { BookingRequest, Address } from '../types/booking';
import { useAuth } from '../contexts/AuthContext';
import { calculatePrice } from '../../lib/geocoding';

interface ElegantBookingFormProps {
  onBookingSubmit: (booking: BookingRequest) => void;
  isLoading?: boolean;
}

export default function ElegantBookingForm({ onBookingSubmit, isLoading = false }: ElegantBookingFormProps) {
  const { user } = useAuth();
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [pickupCoordinates, setPickupCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [destinationCoordinates, setDestinationCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [pickupDateTime, setPickupDateTime] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isLoadingCoordinates, setIsLoadingCoordinates] = useState(false);
  const [coordinateError, setCoordinateError] = useState<string>('');

  // Generate date/time options
  const generateDateTimeOptions = () => {
    const options = [];
    const now = new Date();
    
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const date = new Date(now);
      date.setDate(now.getDate() + dayOffset);
      
      let startHour = 6;
      if (dayOffset === 0) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        let nextMinute = Math.ceil(currentMinute / 15) * 15;
        if (nextMinute >= 60) {
          startHour = currentHour + 1;
        } else {
          startHour = currentHour;
        }
        if (startHour > 22) continue;
      }
      
      for (let hour = startHour; hour <= 22; hour++) {
        const startMinute = (dayOffset === 0 && hour === startHour) ? 
          Math.ceil(now.getMinutes() / 15) * 15 : 0;
        
        for (let minute = startMinute; minute < 60; minute += 15) {
          if (dayOffset === 0) {
            const currentTime = new Date();
            const optionTime = new Date(date);
            optionTime.setHours(hour, minute, 0, 0);
            if (optionTime <= currentTime) continue;
          }
          
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const dateTime = new Date(date);
          dateTime.setHours(hour, minute, 0, 0);
          
          const dateLabel = date.toLocaleDateString('sv-SE', { 
            weekday: 'short', 
            day: 'numeric', 
            month: 'short' 
          });
          
          options.push({
            value: dateTime.toISOString(),
            label: `${dateLabel} ${timeString}`
          });
        }
      }
    }
    return options;
  };

  // Load coordinates from URL parameters
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
            
            const { geocodeAddress } = await import('../../lib/geocoding');
            
            try {
              const [pickupCoords, destCoords] = await Promise.all([
                geocodeAddress(decodedPickup),
                geocodeAddress(decodedDestination)
              ]);
              
              setPickupCoordinates(pickupCoords);
              setDestinationCoordinates(destCoords);
            } catch (geocodeError) {
              console.error('Geocoding error:', geocodeError);
              setCoordinateError('Adresserna kunde inte verifieras automatiskt.');
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
      } catch (error) {
        console.error('Price calculation error:', error);
        setEstimatedPrice(299); // Fallback price
      } finally {
        setIsCalculatingPrice(false);
      }
    } else {
      setEstimatedPrice(null);
    }
  }, [pickupCoordinates, destinationCoordinates]);

  const parseAddress = (formattedAddress: string): Address => {
    if (!formattedAddress) {
      return { street: '', city: '', postalCode: '', country: 'Sverige' };
    }
    
    const parts = formattedAddress.split(',').map(part => part.trim()).filter(part => part.length > 0);
    
    let street = '';
    let postalCode = '';
    let city = '';
    let country = '';
    
    if (parts.length === 0) {
      return { street: formattedAddress, city: '', postalCode: '', country: 'Sverige' };
    }
    
    street = parts[0];
    
    const lastPart = parts[parts.length - 1];
    const countryNames = ['Sverige', 'Sweden', 'SE'];
    if (parts.length > 1 && countryNames.some(cn => lastPart.toLowerCase().includes(cn.toLowerCase()))) {
      country = lastPart;
      parts.pop();
    } else {
      country = 'Sverige';
    }
    
    if (parts.length > 1) {
      const cityPart = parts[1];
      const postalMatch = cityPart.match(/\b(\d{3})\s?(\d{2})\b/);
      if (postalMatch) {
        postalCode = `${postalMatch[1]} ${postalMatch[2]}`;
        city = cityPart.replace(postalMatch[0], '').trim();
        if (!city && parts.length > 2) {
          city = parts[2];
        }
      } else {
        city = cityPart;
      }
    }
    
    street = street.replace(/,$/, '').trim();
    city = city.replace(/^,|,$/g, '').trim();
    
    return {
      street: street || formattedAddress,
      city: city || '',
      postalCode: postalCode || '',
      country: country || 'Sverige'
    };
  };

  const handleSubmit = () => {
    if (!user) return;
    if (!pickupCoordinates || !destinationCoordinates) return;
    if (!estimatedPrice) return;
    if (!pickupDateTime || !licensePlate || !termsAccepted || !privacyAccepted) return;

    const parsedPickupAddress = parseAddress(pickupAddress);
    const parsedDestinationAddress = parseAddress(destinationAddress);
    
    const booking: BookingRequest = {
      customerId: user.uid,
      pickupLocation: {
        ...parsedPickupAddress,
        coordinates: pickupCoordinates
      },
      destination: {
        ...parsedDestinationAddress,
        coordinates: destinationCoordinates
      },
      pickupTime: new Date(pickupDateTime),
      serviceTypeId: 'standard',
      licensePlate,
      termsAccepted,
      privacyAccepted,
      estimatedPrice: estimatedPrice
    };

    onBookingSubmit(booking);
  };

  const canProceed = () => {
    return pickupCoordinates && 
           destinationCoordinates && 
           pickupDateTime && 
           licensePlate && 
           estimatedPrice && 
           termsAccepted && 
           privacyAccepted;
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-stone-900/5 border border-stone-200/50 overflow-hidden">
      {/* Loading State */}
      {isLoadingCoordinates && (
        <div className="p-8 text-center border-b border-stone-100">
          <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-stone-600 text-sm">Laddar adressinformation...</p>
        </div>
      )}

      {/* Error State */}
      {coordinateError && !isLoadingCoordinates && (
        <div className="p-6 bg-red-50 border-b border-red-100">
          <p className="text-red-800 text-sm">⚠️ {coordinateError}</p>
          <p className="text-red-600 text-xs mt-1">Välj adresser från förslagslistan nedan.</p>
        </div>
      )}

      <div className="p-8 space-y-8">
        {/* Route Section */}
        <div className="space-y-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-3 h-3 bg-stone-900 rounded-full"></div>
            <div className="flex-1 h-px bg-stone-200"></div>
            <div className="w-3 h-3 border-2 border-stone-900 rounded-full bg-white"></div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Från</label>
              <GooglePlacesAutocomplete
                value={pickupAddress}
                onChange={(address, details) => {
                  setPickupAddress(address);
                  if (details?.coordinates) {
                    setPickupCoordinates(details.coordinates);
                    setCoordinateError('');
                  }
                }}
                placeholder="Upphämtningsplats"
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
              />
              {pickupAddress && !pickupCoordinates && (
                <p className="text-amber-600 text-xs mt-1">Välj från förslagslistan</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Till</label>
              <GooglePlacesAutocomplete
                value={destinationAddress}
                onChange={(address, details) => {
                  setDestinationAddress(address);
                  if (details?.coordinates) {
                    setDestinationCoordinates(details.coordinates);
                    setCoordinateError('');
                  }
                }}
                placeholder="Destination"
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
              />
              {destinationAddress && !destinationCoordinates && (
                <p className="text-amber-600 text-xs mt-1">Välj från förslagslistan</p>
              )}
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Hämtningstid</label>
            <select
              value={pickupDateTime}
              onChange={(e) => setPickupDateTime(e.target.value)}
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
            >
              <option value="">Välj tid</option>
              {generateDateTimeOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Registreringsnummer</label>
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              placeholder="ABC 123"
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
              maxLength={8}
            />
          </div>
        </div>

        {/* Price Display */}
        {(estimatedPrice || isCalculatingPrice) && (
          <div className="bg-stone-50 rounded-2xl p-6 text-center">
            {isCalculatingPrice ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin"></div>
                <span className="text-stone-600">Beräknar pris...</span>
              </div>
            ) : (
              <div>
                <div className="text-3xl font-light text-stone-900 mb-1">{estimatedPrice} kr</div>
                <div className="text-sm text-stone-500">Inkl. moms</div>
              </div>
            )}
          </div>
        )}

        {/* Terms */}
        <div className="space-y-3">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-stone-900 border-stone-300 rounded focus:ring-stone-900"
            />
            <span className="text-sm text-stone-600">
              Jag accepterar <a href="/villkor" className="text-stone-900 underline">användarvillkoren</a>
            </span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-stone-900 border-stone-300 rounded focus:ring-stone-900"
            />
            <span className="text-sm text-stone-600">
              Jag accepterar <a href="/integritet" className="text-stone-900 underline">integritetspolicyn</a>
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!canProceed() || isLoading}
          className="w-full bg-stone-900 text-white py-4 px-6 rounded-xl font-medium hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Bokar...</span>
            </div>
          ) : (
            'Bekräfta bokning'
          )}
        </button>

        {/* Missing Requirements */}
        {!canProceed() && !isLoading && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-800 text-sm font-medium mb-2">För att fortsätta behöver du:</p>
            <ul className="text-amber-700 text-xs space-y-1">
              {(!pickupCoordinates || !destinationCoordinates) && (
                <li>• Välj giltiga adresser från förslagslistan</li>
              )}
              {!pickupDateTime && <li>• Välj hämtningstid</li>}
              {!licensePlate && <li>• Ange registreringsnummer</li>}
              {!termsAccepted && <li>• Acceptera användarvillkoren</li>}
              {!privacyAccepted && <li>• Acceptera integritetspolicyn</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
