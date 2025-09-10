'use client';

import { useState } from 'react';

interface ServiceOption {
  id: string;
  name: string;
  description: string;
  price: number;
  time: string;
  features: string[];
}

export default function PremiumBooking() {
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [isBooking, setIsBooking] = useState(false);

  const serviceOptions: ServiceOption[] = [
    {
      id: 'standard',
      name: 'Standard Service',
      description: 'Pålitlig chaufför för din resa',
      price: 299,
      time: '5-10 min',
      features: ['Välutbildad chaufför', 'Säker transport', 'Din egen bil']
    },
    {
      id: 'premium',
      name: 'Premium Service',
      description: 'Exklusiv service med extra bekvämlighet',
      price: 499,
      time: '3-5 min',
      features: ['Premium chaufför', 'Snabb ankomst', 'Extra bekvämlighet', 'Prioriterad support']
    },
    {
      id: 'luxury',
      name: 'Luxury Service',
      description: 'Ultimat exklusivitet och service',
      price: 799,
      time: '2-3 min',
      features: ['Luxury chaufför', 'Omedelbar ankomst', 'VIP service', 'Dedikerad support', 'Gratis dryck']
    }
  ];

  const handleBooking = () => {
    if (!pickupLocation || !selectedService) return;
    
    setIsBooking(true);
    // Simulate booking process
    setTimeout(() => {
      setIsBooking(false);
      // TODO: Navigate to tracking
    }, 2000);
  };

  return (
    <div className="premium-booking">
      <div className="booking-header">
        <h2>Boka Din Exklusiva Resa</h2>
        <p>Välj din service och få en pålitlig chaufför</p>
      </div>

      <div className="booking-form">
        <div className="location-inputs">
          <div className="input-group">
            <label>Upphämtningsplats</label>
            <input
              type="text"
              placeholder="Ange vart bilen hämtas"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              className="location-input"
            />
          </div>
          
          <div className="input-group">
            <label>Destination (valfritt)</label>
            <input
              type="text"
              placeholder="Ange vart bilen lämnas"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="location-input"
            />
          </div>
        </div>

        <div className="service-selection">
          <h3>Välj Din Service</h3>
          <div className="service-options">
            {serviceOptions.map((service) => (
              <div
                key={service.id}
                className={`service-option ${selectedService === service.id ? 'selected' : ''}`}
                onClick={() => setSelectedService(service.id)}
              >
                <div className="service-header">
                  <h4>{service.name}</h4>
                  <div className="service-price">
                    <span className="price">{service.price} kr</span>
                    <span className="time">{service.time}</span>
                  </div>
                </div>
                <p className="service-description">{service.description}</p>
                <ul className="service-features">
                  {service.features.map((feature, index) => (
                    <li key={index}>✓ {feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="booking-summary">
          {selectedService && (
            <div className="summary-card">
              <h4>Bokningssammanfattning</h4>
              <div className="summary-details">
                <div className="summary-item">
                  <span>Service:</span>
                  <span>{serviceOptions.find(s => s.id === selectedService)?.name}</span>
                </div>
                <div className="summary-item">
                  <span>Pris:</span>
                  <span>{serviceOptions.find(s => s.id === selectedService)?.price} kr</span>
                </div>
                <div className="summary-item">
                  <span>Ankomsttid:</span>
                  <span>{serviceOptions.find(s => s.id === selectedService)?.time}</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleBooking}
            disabled={!pickupLocation || !selectedService || isBooking}
            className="book-button"
          >
            {isBooking ? (
              <>
                <div className="loading-spinner-small"></div>
                Bokar...
              </>
            ) : (
              'Boka Nu'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}




