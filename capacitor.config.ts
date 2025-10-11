import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.2f8e26fb22ef4f2b9f99078eff6a1042',
  appName: 'strider-territory-run',
  webDir: 'dist',
  server: {
    url: 'https://2f8e26fb-22ef-4f2b-9f99-078eff6a1042.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
