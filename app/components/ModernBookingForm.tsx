'use client';

import { useState, useEffect } from 'react';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';
import { BookingRequest, ServiceType, Address } from '../types/booking';
import { useAuth } from '../contexts/AuthContext';

interface ModernBookingFormProps {
  onBookingSubmit: (booking: BookingRequest) => void;
  isLoading?: boolean;
}

export default function ModernBookingForm({ onBookingSubmit, isLoading = false }: ModernBookingFormProps) {
  const { user, userRole } = useAuth();
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [pickupDateTime, setPickupDateTime] = useState('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [licensePlate, setLicensePlate] = useState('');
  const [error, setError] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [step, setStep] = useState(1);
  const [isEditingAddresses, setIsEditingAddresses] = useState(false);

  // Generera kombinerade datum och tider
  const generateDateTimeOptions = () => {
    const options = [];
    const now = new Date();
    
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const date = new Date(now);
      date.setDate(now.getDate() + dayOffset);
      
      // Bestäm starttid baserat på om det är idag eller framtida dagar
      let startHour = 6;
      if (dayOffset === 0) {
        // För idag, börja från nästa timme (eller nästa 15-minuters intervall)
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // Runda upp till nästa 15-minuters intervall
        let nextMinute = Math.ceil(currentMinute / 15) * 15;
        if (nextMinute >= 60) {
          startHour = currentHour + 1;
          nextMinute = 0;
        } else {
          startHour = currentHour;
        }
        
        // Om vi är förbi 22:00 idag, hoppa till imorgon
        if (startHour > 22 || (startHour === 22 && nextMinute > 0)) {
          continue;
        }
      }
      
      for (let hour = startHour; hour <= 22; hour++) {
        const startMinute = (dayOffset === 0 && hour === startHour) ? 
          Math.ceil(now.getMinutes() / 15) * 15 : 0;
        
        for (let minute = startMinute; minute < 60; minute += 15) {
          // För idag, hoppa över tider som redan har passerat
          if (dayOffset === 0) {
            const currentTime = new Date();
            const optionTime = new Date(date);
            optionTime.setHours(hour, minute, 0, 0);
            
            if (optionTime <= currentTime) {
              continue;
            }
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

  // Läs URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const pickupParam = urlParams.get('pickup');
      const destinationParam = urlParams.get('destination');
      
      if (pickupParam) {
        setPickupAddress(decodeURIComponent(pickupParam));
      }
      if (destinationParam) {
        setDestinationAddress(decodeURIComponent(destinationParam));
      }
      
      // Om adresser finns från hemsidan, starta på steg 1
      if (pickupParam && destinationParam) {
        setStep(1);
        setSelectedService('standard');
      }
    }
  }, []);

  const serviceTypes: ServiceType[] = [
    {
      id: 'standard',
      name: 'Biltransport',
      description: 'Professionell transport av din bil',
      basePrice: 299,
      pricePerKm: 15,
      minimumPrice: 299,
      estimatedWaitTime: 15,
      features: ['Välutbildad chaufför', 'Säker transport', 'Försäkrad service'],
      isActive: true
    }
  ];

  const parseAddress = (addressString: string): Address => {
    // Simple parsing - in production, use Google Geocoding API
    return {
      street: addressString,
      city: 'Stockholm',
      postalCode: '',
      country: 'Sverige'
    };
  };

  const handleSubmit = () => {
    if (!canProceed()) return;

    const selectedServiceType = serviceTypes.find(s => s.id === selectedService);
    if (!selectedServiceType) {
      // Use proper error handling instead of alert
      setError('Välj en service för att fortsätta');
      return;
    }

    const booking: BookingRequest = {
      customerId: user?.uid || 'guest-user', // Use authenticated user ID or guest fallback
      pickupLocation: {
        street: pickupAddress,
        city: 'Stockholm',
        postalCode: '111 22',
        country: 'Sverige'
      },
      destination: {
        street: destinationAddress,
        city: 'Stockholm',
        postalCode: '111 22',
        country: 'Sverige'
      },
      pickupTime: new Date(pickupDateTime),
      serviceTypeId: selectedService,
      licensePlate,
      termsAccepted,
      privacyAccepted
    };

    onBookingSubmit(booking);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return pickupDateTime && selectedService && licensePlate;
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
      

      {/* Step 1: Service and Time Selection */}
      {step === 1 && (
        <div className="booking-step">
          <h3 className="step-title" style={{textTransform: 'none'}}>Bokningsdetaljer</h3>
          
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
                Redigera adresser
              </button>
            </div>
          )}

          {/* Adressredigeringsfält */}
          {isEditingAddresses && (
            <div className="address-edit-form">
              <div className="input-group">
                <label>Upphämtningsplats</label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Ange upphämtningsplats"
                  className="modern-input"
                  required
                />
              </div>
              
              <div className="input-group">
                <label>Destination</label>
                <input
                  type="text"
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="Ange destination"
                  className="modern-input"
                  required
                />
              </div>
              
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
            </div>
          )}
          
          <div className="form-row">
            <div className="input-group">
              <label>Hämtningstid</label>
              <select
                value={pickupDateTime}
                onChange={(e) => setPickupDateTime(e.target.value)}
                className="modern-input"
                required
              >
                <option value="">Välj datum och tid</option>
                {generateDateTimeOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Registreringsnummer</label>
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


          <div className="service-selection">
            <label>Service</label>
            <div className="service-options">
              {serviceTypes.map((service) => (
                <div
                  key={service.id}
                  className={`service-option ${selectedService === service.id ? 'selected' : ''}`}
                  onClick={() => setSelectedService(service.id)}
                >
                  <div className="service-header">
                    <h4>{service.name}</h4>
                    <span className="service-price">{service.basePrice} kr</span>
                  </div>
                  <p className="service-description">{service.description}</p>
                </div>
              ))}
            </div>
          </div>

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
              <span>{serviceTypes.find(s => s.id === selectedService)?.name}</span>
            </div>
            <div className="summary-item">
              <span>Registreringsnummer:</span>
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

