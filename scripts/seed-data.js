#!/usr/bin/env node

/**
 * Seed Data Script
 * Skapar testdata för Avanti bokningssystem
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: "AIzaSyDWaDKO-qdKyxRNX6gag6mAHEs36_Oj9bw",
  authDomain: "avanti-booking-system.firebaseapp.com",
  projectId: "avanti-booking-system",
  storageBucket: "avanti-booking-system.firebasestorage.app",
  messagingSenderId: "524784289735",
  appId: "1:524784289735:web:148ee7e81e5076e4ab3be2",
  measurementId: "G-KXDENH3QY4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedDrivers() {
  console.log('🚗 Skapar testförare...');
  
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
      const docRef = await addDoc(collection(db, 'drivers'), {
        ...driver,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Förare skapad: ${driver.name} (ID: ${docRef.id})`);
    }
    console.log('✅ Alla förare skapade!');
  } catch (error) {
    console.error('❌ Fel vid skapande av förare:', error);
  }
}

async function seedTestBooking() {
  console.log('📋 Skapar testbokning...');
  
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
    console.log(`✅ Testbokning skapad (ID: ${docRef.id})`);
    console.log(`🔗 Visa bokning: http://localhost:3005/booking/${docRef.id}`);
  } catch (error) {
    console.error('❌ Fel vid skapande av testbokning:', error);
  }
}

async function main() {
  console.log('🌱 Seed Data för Avanti Bokningssystem');
  console.log('=====================================\n');

  try {
    await seedDrivers();
    console.log('');
    await seedTestBooking();
    console.log('\n✅ All testdata skapad!');
    console.log('\n📋 Nästa steg:');
    console.log('1. Gå till http://localhost:3005/driver för förare dashboard');
    console.log('2. Testa att acceptera bokningen');
    console.log('3. Gå till bokningssidan för att se status');
  } catch (error) {
    console.error('❌ Fel vid seedning:', error);
  }
}

main();
