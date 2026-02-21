// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.outhillsmanali.app',
  appName: 'YourAppName',
  webDir: 'dist', // Ensure this says 'dist'
  server: {
    // This allows the app to request http endpoints even if the app is served via https
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    CapacitorCookies: {
      enabled: true,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;