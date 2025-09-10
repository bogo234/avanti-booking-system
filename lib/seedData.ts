import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const seedDrivers = async () => {
  const drivers = [
    {
      name: 'Erik Eriksson',
      phone: '+46707654321',
      email: 'erik@avanti.se',
      car: 'Volvo XC60',
      licensePlate: 'ABC 123',
      status: 'available',
      rating: 4.8,
      totalRides: 150
    },
    {
      name: 'Anna Andersson',
      phone: '+46701234567',
      email: 'anna@avanti.se',
      car: 'BMW X3',
      licensePlate: 'XYZ 789',
      status: 'available',
      rating: 4.9,
      totalRides: 200
    },
    {
      name: 'Lars Larsson',
      phone: '+46709876543',
      email: 'lars@avanti.se',
      car: 'Mercedes E-Class',
      licensePlate: 'DEF 456',
      status: 'available',
      rating: 4.7,
      totalRides: 120
    }
  ];

  try {
    for (const driver of drivers) {
      await addDoc(collection(db, 'drivers'), {
        ...driver,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    console.log('Drivers seeded successfully');
  } catch (error) {
    console.error('Error seeding drivers:', error);
  }
};

export const seedTestBooking = async () => {
  const testBooking = {
    customer: {
      name: 'Test Kund',
      phone: '+46701111111',
      email: 'test@example.com'
    },
    pickup: {
      address: 'Storgatan 1, Stockholm',
      time: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes from now
    },
    destination: {
      address: 'Arlanda Terminal 5'
    },
    service: 'standard',
    licensePlate: 'TEST 123',
    status: 'waiting',
    price: 300
  };

  try {
    const docRef = await addDoc(collection(db, 'bookings'), {
      ...testBooking,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('Test booking created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating test booking:', error);
  }
};
