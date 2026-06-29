import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword as fbCreateUser,
  signInWithEmailAndPassword as fbSignIn,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  updateProfile as fbUpdateProfile,
  sendEmailVerification as fbSendEmailVerification
} from 'firebase/auth';

// Vite environment configurations
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if credentials are valid (and not template placeholders)
export let isFirebaseConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'your_firebase_api_key_here' && 
  firebaseConfig.authDomain && 
  firebaseConfig.projectId;

let firebaseApp = null;
let firebaseAuth = null;

if (isFirebaseConfigured) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    console.log("🔥 Firebase initialized successfully (Secure Auth Mode).");
  } catch (error) {
    console.error("Failed to initialize real Firebase, switching to mock mode:", error);
    isFirebaseConfigured = false;
  }
} else {
  console.log("☁️ Running in Local Mock Auth Mode. Set VITE_FIREBASE_* keys in your .env to connect to real Firebase Auth.");
}

// Export auth client
export const auth = firebaseAuth;

// Mock database registry for client fallback
const getLocalRegistry = () => JSON.parse(localStorage.getItem('v2s_users_db') || '[]');
const saveLocalRegistry = (registry) => localStorage.setItem('v2s_users_db', JSON.stringify(registry));

// --- REAL OR MOCK WRAPPER INTERFACES ---
export async function registerUser(email, password, username, avatarColor) {
  if (isFirebaseConfigured) {
    // 1. Create user in Firebase Auth
    const userCredential = await fbCreateUser(auth, email, password);
    const user = userCredential.user;
    
    // 2. Set username and avatar theme as photoURL
    await fbUpdateProfile(user, {
      displayName: username,
      photoURL: avatarColor // Store avatar gradient value as photoURL
    });

    // 3. Send email verification
    try {
      await fbSendEmailVerification(user);
    } catch (e) {
      console.warn("Could not send real Firebase verification email (perhaps limits exceeded):", e);
    }

    return {
      uid: user.uid,
      email: user.email,
      displayName: username,
      photoURL: avatarColor,
      emailVerified: user.emailVerified
    };
  } else {
    // Local storage mock register
    const registry = getLocalRegistry();
    if (registry.some(u => u.email === email)) {
      throw new Error("auth/email-already-in-use");
    }

    const newUser = {
      uid: `mock-uid-${Date.now()}`,
      email,
      password, // Mock storage only
      displayName: username,
      photoURL: avatarColor,
      bio: "Productive Vibe2Ship user.",
      emailVerified: false
    };

    registry.push(newUser);
    saveLocalRegistry(registry);
    return newUser;
  }
}

export async function loginUser(email, password) {
  if (isFirebaseConfigured) {
    const userCredential = await fbSignIn(auth, email, password);
    const user = userCredential.user;
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || email.split('@')[0],
      photoURL: user.photoURL || 'linear-gradient(135deg, #8b5cf6, #6366f1)',
      emailVerified: user.emailVerified
    };
  } else {
    // Local storage mock login
    const registry = getLocalRegistry();
    const match = registry.find(u => u.email === email && u.password === password);
    if (!match) {
      throw new Error("auth/invalid-credential");
    }
    return match;
  }
}

export async function logoutUser() {
  if (isFirebaseConfigured) {
    await fbSignOut(auth);
  }
}

export function subscribeToAuthChanges(callback) {
  if (isFirebaseConfigured) {
    return fbOnAuthStateChanged(auth, (user) => {
      if (user) {
        callback({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL || 'linear-gradient(135deg, #8b5cf6, #6366f1)',
          emailVerified: user.emailVerified
        });
      } else {
        callback(null);
      }
    });
  } else {
    // Simulated auth sync
    const saved = localStorage.getItem('v2s_current_user');
    if (saved) {
      callback(JSON.parse(saved));
    } else {
      callback(null);
    }
    // Return dummy unsubscribe
    return () => {};
  }
}

export async function updateUserProfile(displayName, bio, photoURL, currentUser) {
  if (isFirebaseConfigured) {
    const user = auth.currentUser;
    if (user) {
      await fbUpdateProfile(user, { displayName, photoURL });
      // Note: Firebase Auth doesn't have custom metadata fields like 'bio' natively out of the box,
      // so we can store user bio in localStorage or Firestore. For simplicity, we save user metadata locally.
      const localMeta = JSON.parse(localStorage.getItem(`v2s_user_metadata_${user.email}`) || '{}');
      localMeta.bio = bio;
      localStorage.setItem(`v2s_user_metadata_${user.email}`, JSON.stringify(localMeta));

      return {
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        photoURL: photoURL,
        emailVerified: user.emailVerified,
        bio: bio
      };
    }
    throw new Error("No active firebase user found.");
  } else {
    // Mock profile updates
    const registry = getLocalRegistry();
    const updatedRegistry = registry.map(u => {
      if (u.email === currentUser.email) {
        return { ...u, displayName, bio, photoURL };
      }
      return u;
    });
    saveLocalRegistry(updatedRegistry);

    const updatedUser = {
      ...currentUser,
      displayName,
      bio,
      photoURL
    };
    localStorage.setItem('v2s_current_user', JSON.stringify(updatedUser));
    return updatedUser;
  }
}

export async function sendFirebaseVerification() {
  if (isFirebaseConfigured) {
    const user = auth.currentUser;
    if (user) {
      await fbSendEmailVerification(user);
    }
  }
}
