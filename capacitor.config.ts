import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gogame.app',
  appName: 'Go Game',
  // Built frontend output from `nx build go-game` (base href is `/`).
  webDir: 'apps/go-game/dist',
  // Android serves the bundle over https://localhost by default; keep that so
  // calls to an https backend are not treated as mixed content.
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#667eea',
      showSpinner: false,
    },
  },
  // For on-device live reload against your dev machine, uncomment and set the
  // LAN IP of the machine running `nx serve go-game` (port 4200), then run
  // `npx cap sync`. Leave commented for store/release builds.
  // server: {
  //   url: 'http://192.168.0.192:4200',
  //   cleartext: true,
  // },
};

export default config;
