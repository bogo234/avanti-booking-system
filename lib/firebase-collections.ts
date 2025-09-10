import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// Collection names
export const collections = {
  users: 'users',
  bookings: 'bookings',
  drivers: 'drivers',
  messages: 'messages',
  notifications: 'notifications'
} as const;

// Initialize collections with sample data if they don't exist
export const initializeCollections = async () => {
  try {
    // Create sample admin user if users collection is empty
    const usersRef = collection(db, collections.users);
    const adminUserRef = doc(usersRef, 'admin-user');
    
    await setDoc(adminUserRef, {
      email: 'admin@avanti.se',
      name: 'Admin User',
      role: 'admin',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Create sample driver if drivers collection is empty
    const driversRef = collection(db, collections.drivers);
    const sampleDriverRef = doc(driversRef, 'sample-driver');
    
    await setDoc(sampleDriverRef, {
      name: 'Marcus Svensson',
      email: 'marcus@avanti.se',
      phone: '+46709876543',
      car: 'Volvo XC60',
      licensePlate: 'ABC123',
      status: 'available',
      rating: 4.8,
      totalRides: 150,
      location: {
        lat: 59.3293,
        lng: 18.0686
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    console.log('Collections initialized successfully');
  } catch (error) {
    console.error('Error initializing collections:', error);
  }
};

// User interface for Firestore
export interface FirestoreUser {
  id?: string;
  email: string;
  name?: string;
  phone?: string;
  role: 'customer' | 'driver' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: any;
  updatedAt: any;
  lastLogin?: any;
}

// Booking interface for Firestore
export interface FirestoreBooking {
  id?: string;
  customerId: string;
  customerEmail: string;
  pickup: {
    address: string;
    time: string;
    coordinates?: { lat: number; lng: number };
  };
  destination: {
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  service: 'standard' | 'premium' | 'luxury';
  licensePlate: string;
  status: 'waiting' | 'accepted' | 'on_way' | 'arrived' | 'completed' | 'cancelled';
  driver?: {
    id: string;
    name: string;
    phone: string;
    car: string;
    licensePlate: string;
    location?: { lat: number; lng: number };
  };
  price: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: string;
  paymentMethod?: string;
  paidAt?: any;
  createdAt: any;
  updatedAt: any;
}

// Driver interface for Firestore
export interface FirestoreDriver {
  id?: string;
  name: string;
  email: string;
  phone: string;
  car: string;
  licensePlate: string;
  status: 'available' | 'busy' | 'offline';
  location?: { lat: number; lng: number };
  rating: number;
  totalRides: number;
  createdAt: any;
  updatedAt: any;
}
