import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, onSnapshot, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, OAuthProvider, sendEmailVerification, updateProfile, reload } from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDWaDKO-qdKyxRNX6gag6mAHEs36_Oj9bw",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "avanti-booking-system.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "avanti-booking-system",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "avanti-booking-system.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "524784289735",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:524784289735:web:148ee7e81e5076e4ab3be2",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-KXDENH3QY4"
};

// Initialize Firebase app with error handling for duplicates
let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (error: any) {
  console.error('Failed to initialize Firebase:', error);
  throw error;
}

export const db = getFirestore(app);
export const auth = getAuth(app);

// Initialize messaging if in browser
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

// Database collections
export const collections = {
  users: 'users',
  bookings: 'bookings',
  drivers: 'drivers',
  messages: 'messages',
  notifications: 'notifications'
} as const;

// Types
export interface Booking {
  id?: string;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
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
  };
  price: number;
  createdAt: any;
  updatedAt: any;
}

export interface Driver {
  id?: string;
  name: string;
  phone: string;
  email: string;
  car: string;
  licensePlate: string;
  status: 'available' | 'busy' | 'offline';
  location?: { lat: number; lng: number };
  rating: number;
  totalRides: number;
  createdAt: any;
  updatedAt: any;
}

export interface Message {
  id?: string;
  bookingId: string;
  senderId: string;
  senderType: 'customer' | 'driver';
  message: string;
  timestamp: any;
}

// Booking functions
export const createBooking = async (bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = await addDoc(collection(db, collections.bookings), {
      ...bookingData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

export const updateBooking = async (bookingId: string, updates: Partial<Booking>) => {
  try {
    const bookingRef = doc(db, collections.bookings, bookingId);
    await updateDoc(bookingRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    throw error;
  }
};

export const getBooking = async (bookingId: string) => {
  try {
    const bookingRef = doc(db, collections.bookings, bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (bookingSnap.exists()) {
      return { id: bookingSnap.id, ...bookingSnap.data() } as Booking;
    }
    return null;
  } catch (error) {
    console.error('Error getting booking:', error);
    throw error;
  }
};

export const getBookings = async (status?: string) => {
  try {
    let q = query(collection(db, collections.bookings), orderBy('createdAt', 'desc'));
    if (status) {
      q = query(collection(db, collections.bookings), where('status', '==', status), orderBy('createdAt', 'desc'));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
  } catch (error) {
    console.error('Error getting bookings:', error);
    throw error;
  }
};

export const subscribeToBookings = (callback: (bookings: Booking[]) => void, status?: string) => {
  let q = query(collection(db, collections.bookings), orderBy('createdAt', 'desc'));
  if (status) {
    q = query(collection(db, collections.bookings), where('status', '==', status), orderBy('createdAt', 'desc'));
  }
  
  return onSnapshot(q, (querySnapshot) => {
    const bookings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    callback(bookings);
  });
};

export const subscribeToBooking = (bookingId: string, callback: (booking: Booking | null) => void) => {
  const bookingRef = doc(db, collections.bookings, bookingId);
  return onSnapshot(bookingRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as Booking);
    } else {
      callback(null);
    }
  });
};

// Driver functions
export const getDrivers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, collections.drivers));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
  } catch (error) {
    console.error('Error getting drivers:', error);
    throw error;
  }
};

export const updateDriver = async (driverId: string, updates: Partial<Driver>) => {
  try {
    const driverRef = doc(db, collections.drivers, driverId);
    await updateDoc(driverRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating driver:', error);
    throw error;
  }
};

// Message functions
export const sendMessage = async (messageData: Omit<Message, 'id' | 'timestamp'>) => {
  try {
    const docRef = await addDoc(collection(db, collections.messages), {
      ...messageData,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const getMessages = async (bookingId: string) => {
  try {
    const q = query(
      collection(db, collections.messages),
      where('bookingId', '==', bookingId),
      orderBy('timestamp', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

export const subscribeToMessages = (bookingId: string, callback: (messages: Message[]) => void) => {
  const q = query(
    collection(db, collections.messages),
    where('bookingId', '==', bookingId),
    orderBy('timestamp', 'asc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
    callback(messages);
  });
};

// Push notification functions
export const requestNotificationPermission = async () => {
  if (!messaging) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      });
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

export const onMessageListener = () => {
  if (!messaging) return () => {};
  
  return onMessage(messaging, (payload) => {
    console.log('Message received:', payload);
    // Handle foreground messages
    if (payload.notification) {
      new Notification(payload.notification.title || 'Ny notifikation', {
        body: payload.notification.body,
        icon: '/favicon.ico'
      });
    }
  });
};

// Authentication functions
export const signInUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

export const createUser = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const onAuthStateChange = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Google Authentication
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

// Apple Authentication
export const signInWithApple = async () => {
  try {
    const provider = new OAuthProvider('apple.com');
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Apple:', error);
    throw error;
  }
};

// Email verification functions
export const sendEmailVerificationToUser = async (user: any) => {
  try {
    await sendEmailVerification(user, {
      url: `${window.location.origin}/auth?verified=true`,
      handleCodeInApp: true
    });
  } catch (error) {
    console.error('Error sending email verification:', error);
    throw error;
  }
};

export const checkEmailVerificationStatus = async (user: any) => {
  try {
    await reload(user);
    return user.emailVerified;
  } catch (error) {
    console.error('Error checking email verification:', error);
    throw error;
  }
};

export default app;
