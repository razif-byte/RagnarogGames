import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  getDocs,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { PlayerProfile } from '../game/types';

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Google Auth Provider with Google Drive Scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');

// In-memory token caching (never in localStorage/sessionStorage as required)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      // In some environments, token is accessible via credential or user
      console.warn('No access token in credential, fallback to credential token');
    }
    cachedAccessToken = credential?.accessToken || null;
    return { user: result.user, accessToken: cachedAccessToken || '' };
  } catch (error: unknown) {
    console.error('Google Sign In failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessTokenManually = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Firestore Cloud Save & Load
export async function saveProfileToFirestore(player: PlayerProfile, user: User): Promise<void> {
  const saveDocRef = doc(db, 'cloud_saves', user.uid);
  const savePayload = {
    userId: user.uid,
    characterName: player.name,
    job: player.job,
    baseLevel: player.baseLevel,
    jobLevel: player.jobLevel,
    baseExp: player.baseExp,
    jobExp: player.jobExp,
    zeny: player.zeny,
    stats: player.stats,
    statPoints: player.statPoints,
    skillPoints: player.skillPoints,
    inventory: player.inventory,
    equipment: player.equipment,
    skills: player.skills,
    guildId: player.guildId,
    pvpRating: player.pvpRating,
    pvpWins: player.pvpWins,
    pvpLosses: player.pvpLosses,
    currentZone: player.currentZone,
    unlockedHeadgears: player.unlockedHeadgears,
    updatedAt: new Date().toISOString(),
    lastSavedAt: Date.now(),
    syncHash: player.syncHash,
  };

  await setDoc(saveDocRef, savePayload, { merge: true });
}

export async function loadProfileFromFirestore(userId: string): Promise<PlayerProfile | null> {
  const saveDocRef = doc(db, 'cloud_saves', userId);
  const snapshot = await getDoc(saveDocRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    id: data.userId || 'char-restored',
    name: data.characterName || 'Novice',
    job: data.job || 'Swordsman',
    baseLevel: data.baseLevel || 1,
    jobLevel: data.jobLevel || 1,
    baseExp: data.baseExp || 0,
    jobExp: data.jobExp || 0,
    zeny: data.zeny || 5000,
    stats: data.stats || { str: 25, agi: 20, vit: 20, int: 10, dex: 20, luk: 10 },
    statPoints: data.statPoints || 0,
    skillPoints: data.skillPoints || 0,
    equipment: data.equipment || {},
    inventory: data.inventory || [],
    skills: data.skills || [],
    guildId: data.guildId || 'guild-pront-valhalla',
    pvpRating: data.pvpRating || 1400,
    pvpWins: data.pvpWins || 0,
    pvpLosses: data.pvpLosses || 0,
    currentZone: data.currentZone || 'prontera',
    lastSavedAt: data.lastSavedAt || Date.now(),
    syncHash: data.syncHash || 'FIRESTORE-RESTORED',
    unlockedHeadgears: data.unlockedHeadgears || ['Poring Hat'],
  };
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const q = query(collection(db, 'cloud_saves'), limit(1));
    await getDocs(q);
    return true;
  } catch (err) {
    console.warn('Firestore connection check notice:', err);
    return false;
  }
}
