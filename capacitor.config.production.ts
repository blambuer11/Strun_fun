import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.strun.mobile',
  appName: 'Strun',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Solana Mobile dApp Store compatibility
    deepLinks: ['solana'],
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
