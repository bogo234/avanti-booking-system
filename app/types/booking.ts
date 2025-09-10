// Booking System Types - Focus on Legal Compliance and Security

export interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  personalNumber?: string; // For Swedish legal requirements
  address: Address;
  createdAt: Date;
  updatedAt: Date;
  isVerified: boolean;
  isActive: boolean;
}

export interface Driver extends User {
  licenseNumber: string;
  licenseExpiry: string;
  vehicleRegistration: string;
  insuranceNumber: string;
  backgroundCheckDate: string;
  isAvailable: boolean;
  currentLocation?: Location;
  rating: number;
  totalRides: number;
  documents: DriverDocuments;
}

export interface DriverDocuments {
  licenseImage: string;
  insuranceCertificate: string;
  backgroundCheck: string;
  vehicleInspection: string;
}

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  coordinates?: Location;
}

export interface Location {
  lat: number;
  lng: number;
}

export interface Booking {
  id: string;
  customerId: string;
  driverId?: string;
  pickupLocation: Address;
  destination: Address;
  pickupTime: Date;
  estimatedDuration: number; // minutes
  distance: number; // kilometers
  price: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  cancellationReason?: string;
  customerNotes?: string;
  driverNotes?: string;
  legalCompliance: LegalCompliance;
}

export type BookingStatus = 
  | 'pending'
  | 'confirmed'
  | 'driver_assigned'
  | 'driver_en_route'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type PaymentStatus = 
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'disputed';

export interface LegalCompliance {
  termsAccepted: boolean;
  privacyPolicyAccepted: boolean;
  dataProcessingConsent: boolean;
  emergencyContactProvided: boolean;
  insuranceAcknowledged: boolean;
  cancellationPolicyAcknowledged: boolean;
  timestamp: Date;
}

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  pricePerKm: number;
  minimumPrice: number;
  estimatedWaitTime: number; // minutes
  features: string[];
  isActive: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'swish' | 'klarna' | 'invoice';
  lastFour?: string;
  expiryDate?: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface BookingRequest {
  customerId: string;
  pickupLocation: Address;
  destination: Address;
  pickupTime: Date;
  serviceTypeId: string;
  licensePlate?: string;
  customerNotes?: string;
  emergencyContact?: EmergencyContact;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
}

export interface BookingResponse {
  success: boolean;
  bookingId?: string;
  estimatedPrice: number;
  estimatedWaitTime: number;
  message: string;
  errors?: string[];
}

// Legal and Compliance Types
export interface TermsAndConditions {
  version: string;
  effectiveDate: Date;
  content: string;
  requiredConsent: boolean;
}

export interface PrivacyPolicy {
  version: string;
  effectiveDate: Date;
  content: string;
  dataProcessingDetails: DataProcessingDetails;
}

export interface DataProcessingDetails {
  purpose: string[];
  legalBasis: string;
  retentionPeriod: string;
  dataSharing: boolean;
  dataSharingPartners?: string[];
}

export interface InsuranceDetails {
  provider: string;
  policyNumber: string;
  coverageAmount: number;
  validFrom: Date;
  validTo: Date;
  coverageType: string[];
}
