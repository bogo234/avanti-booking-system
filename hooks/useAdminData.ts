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
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'customer' | 'driver' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: any;
  lastLogin?: any;
}

interface Booking {
  id: string;
  status: string;
  price: number;
  paymentStatus: string;
  createdAt: any;
}

interface Driver {
  id: string;
  status: string;
  rating: number;
  totalRides: number;
}

export function useAdminData() {
  const [users, setUsers] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Real-time users subscription
  useEffect(() => {
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeUsers = onSnapshot(
      usersQuery,
      (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
        setUsers(usersData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching users:', error);
        setError('Kunde inte ladda användare');
        setLoading(false);
      }
    );

    return () => unsubscribeUsers();
  }, []);

  // Real-time bookings subscription
  useEffect(() => {
    const bookingsQuery = query(
      collection(db, 'bookings'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribeBookings = onSnapshot(
      bookingsQuery,
      (snapshot) => {
        const bookingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Booking[];
        setBookings(bookingsData);
      },
      (error) => {
        console.error('Error fetching bookings:', error);
      }
    );

    return () => unsubscribeBookings();
  }, []);

  // Real-time drivers subscription
  useEffect(() => {
    const driversQuery = query(
      collection(db, 'drivers'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeDrivers = onSnapshot(
      driversQuery,
      (snapshot) => {
        const driversData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Driver[];
        setDrivers(driversData);
      },
      (error) => {
        console.error('Error fetching drivers:', error);
      }
    );

    return () => unsubscribeDrivers();
  }, []);

  // Update user role
  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  };

  // Update user status
  const updateUserStatus = async (userId: string, newStatus: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: newStatus,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  // Calculate statistics
  const getStatistics = () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentBookings = bookings.filter(booking => 
      booking.createdAt?.toDate?.() > sevenDaysAgo
    );

    const recentUsers = users.filter(user => 
      user.createdAt?.toDate?.() > sevenDaysAgo
    );

    const paidBookings = bookings.filter(booking => 
      booking.paymentStatus === 'paid'
    );

    return {
      bookings: {
        total: bookings.length,
        completed: bookings.filter(b => b.status === 'completed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
        pending: bookings.filter(b => b.status === 'waiting' || b.status === 'accepted').length,
        revenue: paidBookings.reduce((sum, b) => sum + (b.price || 0), 0)
      },
      users: {
        total: users.length,
        customers: users.filter(u => u.role === 'customer').length,
        drivers: users.filter(u => u.role === 'driver').length,
        admins: users.filter(u => u.role === 'admin').length,
        recent: recentUsers.length
      },
      drivers: {
        total: drivers.length,
        available: drivers.filter(d => d.status === 'available').length,
        busy: drivers.filter(d => d.status === 'busy').length,
        offline: drivers.filter(d => d.status === 'offline').length,
        averageRating: drivers.length > 0 
          ? drivers.reduce((sum, d) => sum + (d.rating || 0), 0) / drivers.length 
          : 0
      },
      revenue: {
        total: paidBookings.reduce((sum, b) => sum + (b.price || 0), 0),
        average: paidBookings.length > 0 
          ? paidBookings.reduce((sum, b) => sum + (b.price || 0), 0) / paidBookings.length 
          : 0,
        count: paidBookings.length
      }
    };
  };

  return {
    users,
    bookings,
    drivers,
    loading,
    error,
    updateUserRole,
    updateUserStatus,
    deleteUser,
    getStatistics
  };
}
