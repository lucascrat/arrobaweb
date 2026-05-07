/**
 * Push Notifications via Firebase Cloud Messaging.
 *
 * O Firebase é usado APENAS para FCM. Tudo que é dado de aplicação
 * vive no Supabase.
 *
 * - Capacitor nativo: registra via @capacitor/push-notifications
 * - Web: usa firebase/messaging com Service Worker
 *
 * O token é salvo em `arroba.fcm_tokens` (chave composta user_id + token).
 */
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingSafe } from './firebase';
import { supabase } from './supabase';

async function saveToken(userId: string, token: string, platform: 'web' | 'android' | 'ios') {
  try {
    await supabase
      .from('fcm_tokens')
      .upsert({ user_id: userId, token, platform, updated_at: new Date().toISOString() }, { onConflict: 'user_id,token' });
  } catch (e) {
    console.warn('[fcm] save token failed', e);
  }
}

export const setupPushNotifications = async (userId: string) => {
  if (Capacitor.isNativePlatform()) {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      const platform: 'android' | 'ios' = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
      await saveToken(userId, token.value, platform);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('FCM registration error', error);
    });
  } else {
    try {
      const messaging = await getMessagingSafe();
      if (messaging && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
        if (!('serviceWorker' in navigator)) return;

        const registration = await navigator.serviceWorker.register('/sw.js');
        const token = await getToken(messaging, { serviceWorkerRegistration: registration });
        if (token) {
          await saveToken(userId, token, 'web');
        }

        onMessage(messaging, (payload) => {
          console.log('[fcm] foreground message', payload);
        });
      }
    } catch (e) {
      console.warn('[fcm] web setup failed', e);
    }
  }
};

export const sendPushNotification = async (recipientId: string, title: string, body: string, data?: any) => {
  try {
    const { data: tokens } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', recipientId);
    if (!tokens || tokens.length === 0) return;

    await Promise.all(tokens.map(t =>
      fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientToken: t.token, title, body, data }),
      })
    ));
  } catch (error) {
    console.error('[fcm] send failed', error);
  }
};
