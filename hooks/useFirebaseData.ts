import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, collections } from '../lib/firebase';

// Universal hook for Firebase real-time data
export function useFirebaseData(collectionName: keyof typeof collections, filters?: any) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let q = query(collection(db, collections[collectionName]));

    // Apply filters if provided
    if (filters) {
      if (filters.where) {
        filters.where.forEach((filter: any) => {
          q = query(q, where(filter.field, filter.operator, filter.value));
        });
      }
      if (filters.orderBy) {
        q = query(q, orderBy(filters.orderBy.field, filters.orderBy.direction || 'desc'));
      }
      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const dataArray = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setData(dataArray);
        setLoading(false);
      },
      (error) => {
        console.error(`Error fetching ${collectionName}:`, error);
        setError(`Kunde inte ladda ${collectionName}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, filters]);

  return { data, loading, error };
}

// Hook for user-specific data
export function useUserData(userId: string, userRole: string) {
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [userDrivers, setUserDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    let bookingsQuery;
    let driversQuery;

    if (userRole === 'customer') {
      // Customer sees their own bookings
      bookingsQuery = query(
        collection(db, collections.bookings),
        where('customerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    } else if (userRole === 'driver') {
      // Driver sees bookings assigned to them
      bookingsQuery = query(
        collection(db, collections.bookings),
        where('driver.id', '==', userId),
        orderBy('createdAt', 'desc')
      );
    } else if (userRole === 'admin') {
      // Admin sees all bookings
      bookingsQuery = query(
        collection(db, collections.bookings),
        orderBy('createdAt', 'desc')
      );
    }

    // All users can see drivers
    driversQuery = query(
      collection(db, collections.drivers),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeBookings = onSnapshot(
      bookingsQuery!,
      (snapshot) => {
        const bookings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUserBookings(bookings);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching user bookings:', error);
        setLoading(false);
      }
    );

    const unsubscribeDrivers = onSnapshot(
      driversQuery,
      (snapshot) => {
        const drivers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUserDrivers(drivers);
      },
      (error) => {
        console.error('Error fetching drivers:', error);
      }
    );

    return () => {
      unsubscribeBookings();
      unsubscribeDrivers();
    };
  }, [userId, userRole]);

  return { userBookings, userDrivers, loading };
}

// Hook for real-time booking updates
export function useBookingUpdates(bookingId: string) {
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bookingId) return;

    const bookingRef = doc(db, collections.bookings, bookingId);
    const unsubscribe = onSnapshot(
      bookingRef,
      (doc) => {
        if (doc.exists()) {
          setBooking({ id: doc.id, ...doc.data() });
        } else {
          setError('Bokning hittades inte');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching booking:', error);
        setError('Kunde inte ladda bokning');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [bookingId]);

  return { booking, loading, error };
}

// Hook for real-time driver location updates
export function useDriverLocationUpdates(driverId: string) {
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driverId) return;

    const driverRef = doc(db, collections.drivers, driverId);
    const unsubscribe = onSnapshot(
      driverRef,
      (doc) => {
        if (doc.exists()) {
          const driverData = doc.data();
          setLocation(driverData.location);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching driver location:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [driverId]);

  return { location, loading };
}

// CRUD operations
export const firebaseOperations = {
  // Create
  create: async (collectionName: keyof typeof collections, data: any) => {
    try {
      const docRef = await addDoc(collection(db, collections[collectionName]), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error creating ${collectionName}:`, error);
      throw error;
    }
  },

  // Update
  update: async (collectionName: keyof typeof collections, docId: string, data: any) => {
    try {
      const docRef = doc(db, collections[collectionName], docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error(`Error updating ${collectionName}:`, error);
      throw error;
    }
  },

  // Delete
  delete: async (collectionName: keyof typeof collections, docId: string) => {
    try {
      const docRef = doc(db, collections[collectionName], docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting ${collectionName}:`, error);
      throw error;
    }
  }
};
