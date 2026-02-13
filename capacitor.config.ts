// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.app',
  appName: 'YourAppName',
  webDir: 'dist/public', // Ensure this says 'dist'
};

export default config;