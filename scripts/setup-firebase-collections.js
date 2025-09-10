const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, serverTimestamp } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function setupFirebaseCollections() {
  console.log('🚀 Setting up Firebase collections...');

  try {
    // Create sample admin user
    const adminUserRef = doc(collection(db, 'users'), 'admin-user');
    await setDoc(adminUserRef, {
      email: 'admin@avanti.se',
      name: 'Admin User',
      role: 'admin',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log('✅ Admin user created');

    // Create sample drivers
    const drivers = [
      {
        name: 'Erik Eriksson',
        email: 'erik@avanti.se',
        phone: '+46707654321',
        car: 'Volvo XC60',
        licensePlate: 'ABC 123',
        status: 'available',
        rating: 4.8,
        totalRides: 150,
        location: { lat: 59.3293, lng: 18.0686 }
      },
      {
        name: 'Anna Andersson',
        email: 'anna@avanti.se',
        phone: '+46701234567',
        car: 'BMW X3',
        licensePlate: 'XYZ 789',
        status: 'available',
        rating: 4.9,
        totalRides: 200,
        location: { lat: 59.3293, lng: 18.0686 }
      },
      {
        name: 'Lars Larsson',
        email: 'lars@avanti.se',
        phone: '+46709876543',
        car: 'Mercedes E-Class',
        licensePlate: 'DEF 456',
        status: 'available',
        rating: 4.7,
        totalRides: 120,
        location: { lat: 59.3293, lng: 18.0686 }
      }
    ];

    for (const driver of drivers) {
      const driverRef = doc(collection(db, 'drivers'));
      await setDoc(driverRef, {
        ...driver,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Driver created: ${driver.name}`);
    }

    // Create sample customer
    const customerRef = doc(collection(db, 'users'), 'sample-customer');
    await setDoc(customerRef, {
      email: 'kund@example.com',
      name: 'Test Kund',
      role: 'customer',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log('✅ Sample customer created');

    // Create sample booking
    const bookingRef = doc(collection(db, 'bookings'));
    await setDoc(bookingRef, {
      customerId: 'sample-customer',
      customerEmail: 'kund@example.com',
      pickup: {
        address: 'Stureplan 1, Stockholm',
        time: new Date().toISOString(),
        coordinates: { lat: 59.3365, lng: 18.0728 }
      },
      destination: {
        address: 'Centralstationen, Stockholm',
        coordinates: { lat: 59.3306, lng: 18.0564 }
      },
      service: 'standard',
      licensePlate: 'ABC 123',
      status: 'waiting',
      price: 299,
      paymentStatus: 'pending',
      driver: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('✅ Sample booking created');

    console.log('🎉 Firebase collections setup complete!');
    console.log('\n📋 Collections created:');
    console.log('- users (with admin and sample customer)');
    console.log('- drivers (with 3 sample drivers)');
    console.log('- bookings (with 1 sample booking)');
    console.log('- messages (empty, ready for use)');
    console.log('- notifications (empty, ready for use)');
    
    console.log('\n🔑 Test credentials:');
    console.log('Admin: admin@avanti.se');
    console.log('Customer: kund@example.com');
    console.log('Drivers: erik@avanti.se, anna@avanti.se, lars@avanti.se');

  } catch (error) {
    console.error('❌ Error setting up Firebase collections:', error);
  }
}

setupFirebaseCollections();
