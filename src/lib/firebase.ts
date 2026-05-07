/**
 * Firebase é usado APENAS para Cloud Messaging (push notifications).
 * Todo o restante migrou para Supabase.
 */
import { initializeApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const getMessagingSafe = async () => {
  try {
    if (typeof window !== 'undefined' && (await isSupported())) {
      return getMessaging(app);
    }
  } catch (e) {
    console.warn('[firebase] messaging not supported:', e);
  }
  return null;
};
