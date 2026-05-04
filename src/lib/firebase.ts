import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithCredential } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// Note: persistence is removed to avoid "Operation not supported" errors in certain environments
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId); 
export const auth = getAuth(app);

export const getMessagingSafe = async () => {
  if (typeof window !== 'undefined' && await isSupported()) {
    return getMessaging(app);
  }
  return null;
};

export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  if (Capacitor.isNativePlatform()) {
    const result = await FirebaseAuthentication.signInWithGoogle();
    if (result.credential?.idToken) {
      const credential = GoogleAuthProvider.credential(result.credential.idToken);
      return signInWithCredential(auth, credential);
    }
    throw new Error("Não foi possível recuperar a credencial do Google.");
  }
  return signInWithPopup(auth, googleProvider);
};

export const signInWithGoogleRedirect = () => {
  if (Capacitor.isNativePlatform()) {
     return FirebaseAuthentication.signInWithGoogle();
  }
  return signInWithRedirect(auth, googleProvider);
};

export { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail };
