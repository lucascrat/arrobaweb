import type { CapacitorConfig } from '@capacitor/cli';

const config: any = {
  appId: 'com.arroba.messenger',
  appName: 'Arroba Messenger',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
      googleId: "291416115748-lku7r80n5huihvjjk3k11i92hklftd3k.apps.googleusercontent.com"
    }
  }
};

export default config;
