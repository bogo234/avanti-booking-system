// Script to verify Firebase Phone Authentication setup
const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDWaDKO-qdKyxRNX6gag6mAHEs36_Oj9bw",
  authDomain: "avanti-booking-system.firebaseapp.com",
  projectId: "avanti-booking-system",
  storageBucket: "avanti-booking-system.firebasestorage.app",
  messagingSenderId: "524784289735",
  appId: "1:524784289735:web:148ee7e81e5076e4ab3be2",
  measurementId: "G-KXDENH3QY4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

console.log('✅ Firebase initialized successfully');
console.log('📱 Auth instance created');
console.log('');
console.log('⚠️  IMPORTANT: Make sure to enable Phone Authentication in Firebase Console:');
console.log('1. Go to https://console.firebase.google.com/project/avanti-booking-system/authentication/providers');
console.log('2. Enable "Phone" authentication provider');
console.log('3. Add your testing phone numbers if in development');
console.log('');
console.log('🔑 Also verify your reCAPTCHA settings:');
console.log('1. Check that your domain is authorized in Firebase Console');
console.log('2. Ensure reCAPTCHA site key matches: 6LcR2MUrAAAAAApC3_jVatK4xEhCcjXR_QJypNBx');
