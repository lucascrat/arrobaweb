import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingSafe } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export const setupPushNotifications = async (userId: string) => {
  if (Capacitor.isNativePlatform()) {
    // Native Logic
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('Push notification permission denied');
      return;
    }

    await PushNotifications.register();

    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token: ' + token.value);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { fcmToken: token.value });
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
    });
  } else {
    // Web Logic (already in AuthContext, but could be moved here)
    try {
      const messaging = await getMessagingSafe();
      if (messaging && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.register('/sw.js');
            const token = await getToken(messaging, { 
              serviceWorkerRegistration: registration,
            });
            
            if (token) {
              const userRef = doc(db, 'users', userId);
              await updateDoc(userRef, { fcmToken: token });
            }
          }
        }
      }
    } catch (e) {
      console.warn("Web Messaging setup failed", e);
    }
  }
};
export const sendPushNotification = async (recipientId: string, title: string, body: string, data?: any) => {
  try {
    // 1. Get recipient token from Firestore
    const userSnap = await getDoc(doc(db, 'users', recipientId));
    if (!userSnap.exists()) return;
    
    const { fcmToken } = userSnap.data();
    if (!fcmToken) return;

    // 2. Call Cloudflare Function to send the push
    await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientToken: fcmToken,
        title,
        body,
        data
      })
    });
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
};
