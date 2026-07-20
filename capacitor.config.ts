import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'no.kitozon.app',
  appName: 'Kitozon',
  webDir: 'dist/client',
  server: {
    // Production: load from the live Kitozon site
    url: 'https://99fd63a0f31eb0122b727076a94fe1ae.ctonew.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#059669',
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#059669',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#059669',
      showSpinner: false,
    },
  },
};

export default config;
