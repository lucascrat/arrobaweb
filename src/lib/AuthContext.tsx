import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { setupPushNotifications } from './notifications';
import { soundManager } from './sounds';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRef = React.useRef<any>(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        
        // Presence Logic
        const setOnlineStatus = async (isOnline: boolean) => {
          try {
            // Check if user document exists before updating presence
            const snap = await getDoc(userRef);
            if (snap.exists()) {
              await updateDoc(userRef, {
                online: isOnline,
                lastSeen: serverTimestamp()
              });
            }
          } catch (err) {
            console.warn("Could not set online status:", err);
            // Optionally handle this error too if we want to debug permissions here
            // handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          }
        };

        setOnlineStatus(true);

        const handleVisibilityChange = () => {
          setOnlineStatus(document.visibilityState === 'visible');
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', () => setOnlineStatus(false));

        // Admin allowlist (e-mails reconhecidos como administradores)
        const ADMIN_EMAILS = [
          'lrlucasrafael11@gmail.com',
          'lucasrafaellrl11@gmail.com',
        ];

        // Use onSnapshot for real-time profile updates
        const unsubProfile = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const emailFromAuth = (user.email || '').toLowerCase();
            const emailFromDoc = (data.email || '').toLowerCase();
            const isAdmin =
              ADMIN_EMAILS.includes(emailFromAuth) ||
              ADMIN_EMAILS.includes(emailFromDoc) ||
              data.isAdmin === true ||
              data.role === 'admin';

            // Persiste a flag isAdmin no documento se vier do allowlist
            // (garante que regras Firestore que checam data.isAdmin funcionem)
            if (isAdmin && data.isAdmin !== true) {
              try {
                await updateDoc(userRef, { isAdmin: true, role: 'admin' });
              } catch (e) {
                // sem permissão — segue só com flag em memória
              }
            }

            setProfile({ ...data, email: data.email || user.email || '', isAdmin });
            
            // Sync Sound Settings
            if (data.notificationSettings?.soundEnabled !== undefined) {
              soundManager.setEnabled(data.notificationSettings.soundEnabled);
            }
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        });

        // Push Notification Registration
        setupPushNotifications(user.uid);

        return () => {
          unsubProfile();
          setOnlineStatus(false);
          window.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
