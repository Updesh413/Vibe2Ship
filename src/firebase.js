import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword as fbCreateUser,
  signInWithEmailAndPassword as fbSignIn,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  updateProfile as fbUpdateProfile,
  sendEmailVerification as fbSendEmailVerification,
  reload as fbReload
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  deleteDoc
} from 'firebase/firestore';

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
let firebaseDb = null;

if (isFirebaseConfigured) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);
    console.log("🔥 Firebase Auth and Cloud Firestore initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize real Firebase, switching to mock mode:", error);
    isFirebaseConfigured = false;
  }
} else {
  console.log("☁️ Running in Local Mock Auth Mode. Set VITE_FIREBASE_* keys in your .env to connect to real Firebase Auth.");
}

// Export auth and database clients
export const auth = firebaseAuth;
export const db = firebaseDb;

// Mock database registry for client fallback
const getLocalRegistry = () => JSON.parse(localStorage.getItem('v2s_users_db') || '[]');
const saveLocalRegistry = (registry) => localStorage.setItem('v2s_users_db', JSON.stringify(registry));

// --- REAL OR MOCK WRAPPER INTERFACES ---
export async function registerUser(email, password, username, avatarColor) {
  if (isFirebaseConfigured) {
    const userCredential = await fbCreateUser(auth, email, password);
    const user = userCredential.user;
    
    await fbUpdateProfile(user, {
      displayName: username,
      photoURL: avatarColor
    });

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
    const registry = getLocalRegistry();
    if (registry.some(u => u.email === email)) {
      throw new Error("auth/email-already-in-use");
    }

    const newUser = {
      uid: `mock-uid-${Date.now()}`,
      email,
      password,
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
    const saved = localStorage.getItem('v2s_current_user');
    if (saved) {
      callback(JSON.parse(saved));
    } else {
      callback(null);
    }
    return () => {};
  }
}

export async function updateUserProfile(displayName, bio, photoURL, currentUser) {
  if (isFirebaseConfigured) {
    const user = auth.currentUser;
    if (user) {
      await fbUpdateProfile(user, { displayName, photoURL });
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

export async function reloadCurrentUser() {
  if (isFirebaseConfigured && auth.currentUser) {
    await fbReload(auth.currentUser);
    const user = auth.currentUser;
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      photoURL: user.photoURL || 'linear-gradient(135deg, #8b5cf6, #6366f1)',
      emailVerified: user.emailVerified
    };
  }
  return null;
}

// --- FIRESTORE CLOUD DATABASE INTEGRATION METHODS ---

/**
 * Fetch tasks for the active user session
 */
export async function fetchTasks(userId, email) {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, "tasks"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (error) {
      console.error("Error fetching tasks from Firestore:", error);
      throw error;
    }
  } else {
    const saved = localStorage.getItem(`v2s_tasks_${email}`);
    return saved ? JSON.parse(saved) : [];
  }
}

/**
 * Save or update a single task in Firestore
 */
export async function saveTask(userId, email, task) {
  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, "tasks", task.id), {
        ...task,
        userId
      });
    } catch (error) {
      console.error("Error saving task to Firestore:", error);
      throw error;
    }
  } else {
    // Handled locally by App.jsx localStorage fallback hook
  }
}

/**
 * Delete a single task from Firestore
 */
export async function removeTask(userId, email, taskId) {
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, "tasks", taskId));
    } catch (error) {
      console.error("Error deleting task from Firestore:", error);
      throw error;
    }
  } else {
    // Handled locally by App.jsx localStorage fallback hook
  }
}
