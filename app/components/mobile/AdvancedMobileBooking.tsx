'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from 'framer-motion';
import { MapPin, Clock, CreditCard, User, Car, Star, Navigation, Phone, MessageCircle } from 'lucide-react';

interface BookingStep {
  id: string;
  title: string;
  subtitle: string;
  component: React.ComponentType<any>;
  validation?: () => boolean;
}

interface BookingData {
  pickup: {
    address: string;
    coordinates?: { lat: number; lng: number };
    time: Date;
  };
  destination: {
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  serviceType: 'standard' | 'premium' | 'luxury';
  passengers: number;
  preferences: {
    driverGender?: 'any' | 'male' | 'female';
    vehicleType?: string;
    amenities: string[];
    specialRequests?: string;
  };
  payment: {
    method: string;
    estimatedPrice: number;
  };
}

const AdvancedMobileBooking: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [bookingData, setBookingData] = useState<BookingData>({
    pickup: { address: '', time: new Date() },
    destination: { address: '' },
    serviceType: 'standard',
    passengers: 1,
    preferences: { amenities: [] },
    payment: { method: '', estimatedPrice: 0 }
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Touch/swipe handling
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-300, 0, 300], [0.5, 1, 0.5]);
  const scale = useTransform(x, [-300, 0, 300], [0.9, 1, 0.9]);

  const steps: BookingStep[] = [
    {
      id: 'location',
      title: 'Var ska vi hämta dig?',
      subtitle: 'Ange din avreseplats och destination',
      component: LocationStep
    },
    {
      id: 'service',
      title: 'Välj tjänst',
      subtitle: 'Välj den servicenivå som passar dig bäst',
      component: ServiceStep
    },
    {
      id: 'preferences',
      title: 'Dina preferenser',
      subtitle: 'Anpassa din resa efter dina önskemål',
      component: PreferencesStep
    },
    {
      id: 'payment',
      title: 'Betalning',
      subtitle: 'Välj betalmetod och bekräfta din bokning',
      component: PaymentStep
    },
    {
      id: 'confirmation',
      title: 'Bekräftelse',
      subtitle: 'Din bokning är bekräftad!',
      component: ConfirmationStep
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setSwipeDirection('left');
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setSwipeDirection(null);
      }, 150);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setSwipeDirection('right');
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setSwipeDirection(null);
      }, 150);
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left' && currentStep < steps.length - 1) {
      nextStep();
    } else if (direction === 'right' && currentStep > 0) {
      prevStep();
    }
  };

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header with progress */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={prevStep}
              className={`p-2 rounded-full transition-all ${
                currentStep === 0 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-gray-600 hover:bg-gray-100 active:scale-95'
              }`}
              disabled={currentStep === 0}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="text-center">
              <h1 className="text-lg font-semibold text-gray-900">
                {steps[currentStep].title}
              </h1>
              <p className="text-sm text-gray-500">
                {steps[currentStep].subtitle}
              </p>
            </div>
            
            <div className="w-10 h-10 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-500">
                {currentStep + 1}/{steps.length}
              </span>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div ref={containerRef} className="relative overflow-hidden">
        <motion.div
          style={{ x, opacity, scale }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          onDragEnd={(event, info) => {
            const threshold = 100;
            if (info.offset.x > threshold) {
              handleSwipe('right');
            } else if (info.offset.x < -threshold) {
              handleSwipe('left');
            }
          }}
          className="px-4 py-6"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: swipeDirection === 'left' ? 300 : -300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: swipeDirection === 'left' ? -300 : 300 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {React.createElement(steps[currentStep].component, {
                data: bookingData,
                onUpdate: setBookingData,
                onNext: nextStep,
                onPrev: prevStep,
                isLoading
              })}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Navigation dots */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex space-x-2 bg-white/90 backdrop-blur-lg rounded-full px-4 py-2 shadow-lg">
          {steps.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'bg-indigo-500 scale-125'
                  : index < currentStep
                  ? 'bg-green-400'
                  : 'bg-gray-300'
              }`}
              whileTap={{ scale: 0.8 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Location Step Component
const LocationStep: React.FC<{
  data: BookingData;
  onUpdate: (data: BookingData) => void;
  onNext: () => void;
}> = ({ data, onUpdate, onNext }) => {
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Reverse geocode to get address
        onUpdate({
          ...data,
          pickup: {
            ...data.pickup,
            coordinates: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            },
            address: 'Din nuvarande plats'
          }
        });
        setUseCurrentLocation(true);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Location error:', error);
        setIsGettingLocation(false);
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Pickup location */}
      <div className="space-y-3">
        <label className="flex items-center text-sm font-medium text-gray-700">
          <MapPin className="w-4 h-4 mr-2 text-green-500" />
          Hämtningsplats
        </label>
        
        <div className="relative">
          <input
            type="text"
            value={data.pickup.address}
            onChange={(e) => onUpdate({
              ...data,
              pickup: { ...data.pickup, address: e.target.value }
            })}
            placeholder="Ange adress eller sök efter plats"
            className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        <motion.button
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
          className="flex items-center justify-center w-full py-3 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50"
          whileTap={{ scale: 0.98 }}
        >
          {isGettingLocation ? (
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <Navigation className="w-4 h-4 mr-2" />
          )}
          {isGettingLocation ? 'Hämtar position...' : 'Använd min nuvarande plats'}
        </motion.button>
      </div>

      {/* Destination */}
      <div className="space-y-3">
        <label className="flex items-center text-sm font-medium text-gray-700">
          <MapPin className="w-4 h-4 mr-2 text-red-500" />
          Destination
        </label>
        
        <div className="relative">
          <input
            type="text"
            value={data.destination.address}
            onChange={(e) => onUpdate({
              ...data,
              destination: { ...data.destination, address: e.target.value }
            })}
            placeholder="Vart ska du åka?"
            className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Pickup time */}
      <div className="space-y-3">
        <label className="flex items-center text-sm font-medium text-gray-700">
          <Clock className="w-4 h-4 mr-2 text-blue-500" />
          Avresetid
        </label>
        
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center py-3 px-4 bg-indigo-500 text-white rounded-xl font-medium">
            <Clock className="w-4 h-4 mr-2" />
            Nu
          </button>
          <button className="flex items-center justify-center py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-medium">
            <Clock className="w-4 h-4 mr-2" />
            Senare
          </button>
        </div>
      </div>

      {/* Continue button */}
      <motion.button
        onClick={onNext}
        disabled={!data.pickup.address || !data.destination.address}
        className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        whileTap={{ scale: 0.98 }}
      >
        Fortsätt
      </motion.button>
    </div>
  );
};

// Service Step Component
const ServiceStep: React.FC<{
  data: BookingData;
  onUpdate: (data: BookingData) => void;
  onNext: () => void;
}> = ({ data, onUpdate, onNext }) => {
  const services = [
    {
      type: 'standard',
      name: 'Standard',
      description: 'Bekväm och prisvärd transport',
      price: 'från 89 kr',
      features: ['Komfortabla fordon', 'Professionella förare', 'GPS-spårning'],
      icon: '🚗',
      estimatedTime: '5-10 min'
    },
    {
      type: 'premium',
      name: 'Premium',
      description: 'Högre komfort och service',
      price: 'från 149 kr',
      features: ['Premium fordon', 'WiFi & laddare', 'Flaskvatten', 'Prioriterad service'],
      icon: '🚙',
      estimatedTime: '3-8 min'
    },
    {
      type: 'luxury',
      name: 'Luxury',
      description: 'Exklusiv reseupplevelse',
      price: 'från 299 kr',
      features: ['Lyxbilar (Mercedes, BMW)', 'Personlig chaufför', 'Champagne på begäran', 'Concierge-service'],
      icon: '🏎️',
      estimatedTime: '2-5 min'
    }
  ];

  return (
    <div className="space-y-4">
      {services.map((service) => (
        <motion.div
          key={service.type}
          onClick={() => onUpdate({ ...data, serviceType: service.type as any })}
          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
            data.serviceType === service.type
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-start space-x-4">
            <div className="text-3xl">{service.icon}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{service.name}</h3>
                <div className="text-right">
                  <p className="font-bold text-indigo-600">{service.price}</p>
                  <p className="text-xs text-gray-500">{service.estimatedTime}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">{service.description}</p>
              <div className="space-y-1">
                {service.features.map((feature, index) => (
                  <div key={index} className="flex items-center text-xs text-gray-500">
                    <div className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Passenger count */}
      <div className="bg-gray-50 rounded-xl p-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Antal passagerare
        </label>
        <div className="flex items-center justify-between">
          <button
            onClick={() => onUpdate({ ...data, passengers: Math.max(1, data.passengers - 1) })}
            className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
          >
            -
          </button>
          <span className="text-lg font-semibold">{data.passengers}</span>
          <button
            onClick={() => onUpdate({ ...data, passengers: Math.min(8, data.passengers + 1) })}
            className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
          >
            +
          </button>
        </div>
      </div>

      <motion.button
        onClick={onNext}
        className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg"
        whileTap={{ scale: 0.98 }}
      >
        Välj {services.find(s => s.type === data.serviceType)?.name}
      </motion.button>
    </div>
  );
};

// Preferences Step Component
const PreferencesStep: React.FC<{
  data: BookingData;
  onUpdate: (data: BookingData) => void;
  onNext: () => void;
}> = ({ data, onUpdate, onNext }) => {
  const amenities = [
    { id: 'wifi', name: 'WiFi', icon: '📶' },
    { id: 'charger', name: 'Laddare', icon: '🔌' },
    { id: 'water', name: 'Flaskvatten', icon: '💧' },
    { id: 'newspapers', name: 'Tidningar', icon: '📰' },
    { id: 'child_seat', name: 'Barnstol', icon: '👶' },
    { id: 'wheelchair', name: 'Rullstolsanpassad', icon: '♿' }
  ];

  const toggleAmenity = (amenityId: string) => {
    const current = data.preferences.amenities;
    const updated = current.includes(amenityId)
      ? current.filter(id => id !== amenityId)
      : [...current, amenityId];
    
    onUpdate({
      ...data,
      preferences: { ...data.preferences, amenities: updated }
    });
  };

  return (
    <div className="space-y-6">
      {/* Driver preferences */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900">Förarpreferenser</h3>
        <div className="grid grid-cols-3 gap-2">
          {['any', 'male', 'female'].map((gender) => (
            <button
              key={gender}
              onClick={() => onUpdate({
                ...data,
                preferences: { ...data.preferences, driverGender: gender as any }
              })}
              className={`py-2 px-3 text-sm rounded-lg transition-colors ${
                data.preferences.driverGender === gender
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {gender === 'any' ? 'Spelar ingen roll' : gender === 'male' ? 'Man' : 'Kvinna'}
            </button>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900">Extra bekvämligheter</h3>
        <div className="grid grid-cols-2 gap-3">
          {amenities.map((amenity) => (
            <motion.button
              key={amenity.id}
              onClick={() => toggleAmenity(amenity.id)}
              className={`flex items-center space-x-3 p-3 rounded-xl border-2 transition-all ${
                data.preferences.amenities.includes(amenity.id)
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-xl">{amenity.icon}</span>
              <span className="text-sm font-medium">{amenity.name}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Special requests */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900">Särskilda önskemål</h3>
        <textarea
          value={data.preferences.specialRequests || ''}
          onChange={(e) => onUpdate({
            ...data,
            preferences: { ...data.preferences, specialRequests: e.target.value }
          })}
          placeholder="T.ex. extra stopp, hjälp med bagage, etc."
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          rows={3}
        />
      </div>

      <motion.button
        onClick={onNext}
        className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg"
        whileTap={{ scale: 0.98 }}
      >
        Fortsätt till betalning
      </motion.button>
    </div>
  );
};

// Payment Step Component
const PaymentStep: React.FC<{
  data: BookingData;
  onUpdate: (data: BookingData) => void;
  onNext: () => void;
}> = ({ data, onUpdate, onNext }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const paymentMethods = [
    { id: 'card', name: 'Kort', icon: '💳', description: 'Visa, Mastercard, American Express' },
    { id: 'swish', name: 'Swish', icon: '📱', description: 'Betala med Swish' },
    { id: 'klarna', name: 'Klarna', icon: '🛍️', description: 'Köp nu, betala senare' },
    { id: 'company', name: 'Företag', icon: '🏢', description: 'Fakturering till företag' }
  ];

  const processPayment = async () => {
    setIsProcessing(true);
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Price summary */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Prissammanfattning</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Grundpris</span>
            <span>189 kr</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Serviceavgift</span>
            <span>15 kr</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Moms (25%)</span>
            <span>51 kr</span>
          </div>
          {data.preferences.amenities.length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Extra bekvämligheter</span>
              <span>25 kr</span>
            </div>
          )}
          <hr className="my-2" />
          <div className="flex justify-between font-semibold text-lg">
            <span>Totalt</span>
            <span className="text-indigo-600">280 kr</span>
          </div>
        </div>
      </div>

      {/* Payment methods */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900">Betalmetod</h3>
        <div className="space-y-2">
          {paymentMethods.map((method) => (
            <motion.button
              key={method.id}
              onClick={() => onUpdate({
                ...data,
                payment: { ...data.payment, method: method.id }
              })}
              className={`w-full flex items-center space-x-4 p-4 border-2 rounded-xl transition-all ${
                data.payment.method === method.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-2xl">{method.icon}</span>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">{method.name}</p>
                <p className="text-sm text-gray-500">{method.description}</p>
              </div>
              {data.payment.method === method.id && (
                <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Terms */}
      <div className="text-xs text-gray-500 leading-relaxed">
        Genom att fortsätta godkänner du våra{' '}
        <a href="#" className="text-indigo-600 underline">användarvillkor</a> och{' '}
        <a href="#" className="text-indigo-600 underline">integritetspolicy</a>.
      </div>

      <motion.button
        onClick={processPayment}
        disabled={!data.payment.method || isProcessing}
        className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        whileTap={{ scale: 0.98 }}
      >
        {isProcessing ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Bearbetar betalning...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Bekräfta och betala 280 kr
          </>
        )}
      </motion.button>
    </div>
  );
};

// Confirmation Step Component
const ConfirmationStep: React.FC<{
  data: BookingData;
}> = ({ data }) => {
  const [driverETA, setDriverETA] = useState(8);

  useEffect(() => {
    // Simulate decreasing ETA
    const interval = setInterval(() => {
      setDriverETA(prev => Math.max(1, prev - 1));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 text-center">
      {/* Success animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 10 }}
        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <motion.svg
          className="w-10 h-10 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </motion.svg>
      </motion.div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Bokning bekräftad!</h2>
        <p className="text-gray-600">Din förare är på väg</p>
      </div>

      {/* Driver info */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-gray-500" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-semibold text-gray-900">Magnus Andersson</h3>
            <div className="flex items-center text-sm text-gray-500">
              <Star className="w-4 h-4 text-yellow-400 mr-1" />
              4.9 • BMW 5-serie • ABC 123
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-indigo-600">{driverETA} min</p>
            <p className="text-xs text-gray-500">Ankomst</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          className="flex items-center justify-center py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
          whileTap={{ scale: 0.98 }}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Meddelande
        </motion.button>
        <motion.button
          className="flex items-center justify-center py-3 bg-green-500 text-white rounded-xl font-medium"
          whileTap={{ scale: 0.98 }}
        >
          <Phone className="w-4 h-4 mr-2" />
          Ring
        </motion.button>
      </div>

      {/* Live tracking */}
      <motion.button
        className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg flex items-center justify-center"
        whileTap={{ scale: 0.98 }}
      >
        <Navigation className="w-5 h-5 mr-2" />
        Spåra förare live
      </motion.button>

      {/* Booking details */}
      <div className="bg-gray-50 rounded-xl p-4 text-left">
        <h4 className="font-medium text-gray-900 mb-3">Bokningsdetaljer</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Bokningsnummer:</span>
            <span className="font-medium">#AV2024-0123</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tjänst:</span>
            <span className="font-medium capitalize">{data.serviceType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Betalning:</span>
            <span className="font-medium">280 kr betalt</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedMobileBooking;
