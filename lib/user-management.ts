import { 
  User, 
  sendEmailVerification, 
  updateProfile, 
  reload,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  where,
  getDocs,
  collection
} from 'firebase/firestore';
import { auth, db } from './firebase';

// Interfaces baserade på officiella Firebase-rekommendationer
export interface UserProfile {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  phone: string | null;
  role: 'customer' | 'driver' | 'admin';
  profile: {
    name: string;
    phone?: string;
    preferences: {
      defaultAddresses: {
        home?: {
          address: string;
          coordinates?: { lat: number; lng: number };
        };
        work?: {
          address: string;
          coordinates?: { lat: number; lng: number };
        };
      };
      notifications: {
        email: boolean;
        sms: boolean;
        push: boolean;
      };
      language: 'sv' | 'en';
    };
  };
  metadata: {
    createdAt: any;
    updatedAt: any;
    lastLogin?: any;
    emailVerificationSentAt?: any;
  };
  status: 'active' | 'suspended' | 'pending_verification';
}

// Officiella Firebase-funktioner för e-postverifiering
export const sendVerificationEmail = async (user: User): Promise<void> => {
  try {
    await sendEmailVerification(user, {
      url: `${window.location.origin}/auth?verified=true`,
      handleCodeInApp: true
    });
    
    // Uppdatera metadata om när verifieringsmail skickades
    if (user.uid) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'metadata.emailVerificationSentAt': serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

// Skapa användarprofil i Firestore (officiell rekommendation)
export const createUserProfile = async (
  user: User, 
  additionalData: {
    name: string;
    phone?: string;
    role?: 'customer' | 'driver' | 'admin';
  }
): Promise<void> => {
  if (!user.uid) return;

  const userRef = doc(db, 'users', user.uid);
  
  try {
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        phone: user.phoneNumber,
        role: additionalData.role || 'customer',
        profile: {
          name: additionalData.name || null,
          phone: additionalData.phone || null,
          preferences: {
            defaultAddresses: {},
            notifications: {
              email: true,
              sms: true,
              push: true
            },
            language: 'sv'
          }
        },
        metadata: {
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        },
        status: (user.emailVerified || additionalData.role === 'admin') ? 'active' : 'pending_verification'
      };

      await setDoc(userRef, userProfile);
      
      // Uppdatera Firebase Auth-profil
      await updateProfile(user, {
        displayName: additionalData.name || null
      });
    }
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

// Hämta användarprofil
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Uppdatera användarprofil
export const updateUserProfile = async (
  uid: string, 
  updates: Partial<UserProfile>
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      'metadata.updatedAt': serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Koppla befintliga bokningar till användarkonto
export const linkExistingBookings = async (userEmail: string, uid: string): Promise<number> => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef, 
      where('customer.email', '==', userEmail),
      where('customerId', '==', null) // Endast bokningar utan kopplad användare
    );
    
    const querySnapshot = await getDocs(q);
    let linkedCount = 0;
    
    for (const docSnap of querySnapshot.docs) {
      await updateDoc(doc(db, 'bookings', docSnap.id), {
        customerId: uid,
        'metadata.linkedToUser': serverTimestamp()
      });
      linkedCount++;
    }
    
    return linkedCount;
  } catch (error) {
    console.error('Error linking existing bookings:', error);
    throw error;
  }
};

// Verifiera e-postadress status
export const checkEmailVerification = async (user: User): Promise<boolean> => {
  try {
    await reload(user);
    
    if (user.emailVerified) {
      // Uppdatera status i Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        emailVerified: true,
        status: 'active',
        'metadata.updatedAt': serverTimestamp()
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking email verification:', error);
    throw error;
  }
};

// Ta bort användarkonto (GDPR-compliance)
export const deleteUserAccount = async (user: User, password: string): Promise<void> => {
  try {
    // Re-autentisera användaren före borttagning (säkerhetskrav)
    const credential = EmailAuthProvider.credential(user.email!, password);
    await reauthenticateWithCredential(user, credential);
    
    // Ta bort från Firestore först
    const userRef = doc(db, 'users', user.uid);
    await deleteDoc(userRef);
    
    // Anonymisera bokningar istället för att ta bort dem
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('customerId', '==', user.uid));
    const querySnapshot = await getDocs(q);
    
    for (const docSnap of querySnapshot.docs) {
      await updateDoc(doc(db, 'bookings', docSnap.id), {
        'customer.email': '[DELETED]',
        'customer.name': '[DELETED]',
        'customer.phone': '[DELETED]',
        customerId: null,
        'metadata.userDeleted': serverTimestamp()
      });
    }
    
    // Ta bort Firebase Auth-konto sist
    await user.delete();
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw error;
  }
};

// Ändra lösenord
export const changeUserPassword = async (
  user: User, 
  currentPassword: string, 
  newPassword: string
): Promise<void> => {
  try {
    // Re-autentisera först
    const credential = EmailAuthProvider.credential(user.email!, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Uppdatera lösenord
    await updatePassword(user, newPassword);
    
    // Logga ändringen
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      'metadata.passwordChangedAt': serverTimestamp(),
      'metadata.updatedAt': serverTimestamp()
    });
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
};

// Exportera användardata (GDPR-compliance)
export const exportUserData = async (uid: string): Promise<any> => {
  try {
    const userProfile = await getUserProfile(uid);
    
    // Hämta användarens bokningar
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('customerId', '==', uid));
    const bookingsSnapshot = await getDocs(q);
    const bookings = bookingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return {
      profile: userProfile,
      bookings: bookings,
      exportedAt: new Date().toISOString(),
      dataRetentionInfo: 'Data sparas enligt Avantis integritetspolicy'
    };
  } catch (error) {
    console.error('Error exporting user data:', error);
    throw error;
  }
};
