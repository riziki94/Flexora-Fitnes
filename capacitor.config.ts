import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flexora.fitnes',
  appName: 'Flexora Fitnes',
  webDir: 'dist/client',
  server: {
    // Production: load from the live Flexora Fitnes site
    url: 'https://www.flexorafitnes.com',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#1A56DB',
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1A56DB',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1A56DB',
      showSpinner: false,
    },
  },
};

export default config;
