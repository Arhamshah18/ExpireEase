import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.expireease.app',
  appName: 'ExpireEase',
  webDir: '.vercel/output/static',
  android: {
    path: 'android',
  },
};

export default config;
