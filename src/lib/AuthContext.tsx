import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { auth, db, getMessagingSafe } from './firebase';
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
            console.warn("Could not set online status (might be new user):", err);
          }
        };

        setOnlineStatus(true);

        const handleVisibilityChange = () => {
          setOnlineStatus(document.visibilityState === 'visible');
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', () => setOnlineStatus(false));

        // Use onSnapshot for real-time profile updates
        const unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile(data);
            
            // Sync Sound Settings
            if (data.notificationSettings?.soundEnabled !== undefined) {
              soundManager.setEnabled(data.notificationSettings.soundEnabled);
            }
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile listen error:", error);
          setLoading(false);
        });

        // Push Notification Registration
        const setupMessaging = async () => {
          try {
            const messaging = await getMessagingSafe();
            if (messaging && 'Notification' in window) {
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                try {
                  // Register Service Worker explicitly
                  if ('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.register('/sw.js');
                    const token = await getToken(messaging, { 
                      serviceWorkerRegistration: registration,
                    });
                    
                    if (token) {
                      try {
                        await updateDoc(userRef, { fcmToken: token });
                      } catch (err) {
                        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
                      }
                    }

                    onMessage(messaging, (payload) => {
                      console.log('Message received. ', payload);
                      
                      // Respect push setting
                      if (profileRef.current?.notificationSettings?.pushEnabled === false) {
                        return;
                      }

                      if ('Notification' in window && Notification.permission === 'granted') {
                        try {
                          new Notification(payload.notification?.title || 'Novo Alerta', {
                            body: payload.notification?.body,
                            icon: profileRef.current?.photoURL
                          });
                        } catch(e) {
                          console.warn('Could not show notification', e);
                        }
                      }
                    });
                  }
                } catch (err) {
                  console.warn("FCM registration skipped or failed:", err);
                }
              }
            }
          } catch (e) {
             console.warn("Messaging is not supported or failed to init", e);
          }
        };

        setupMessaging();

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
