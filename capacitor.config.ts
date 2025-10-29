import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.strun.mobile',
  appName: 'Strun',
  webDir: 'dist',
  server: {
    url: 'https://2f8e26fb-22ef-4f2b-9f99-078eff6a1042.lovableproject.com?forceHideBadge=true',
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0F172A',
      showSpinner: false
    },
    Geolocation: {
      requestPermission: true
    }
  }
};

export default config;
