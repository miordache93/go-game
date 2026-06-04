import { Capacitor } from '@capacitor/core';

/**
 * Native-only bootstrap for the Capacitor shell. Safe to call on web, where it
 * does nothing (the plugins are not implemented in a browser context).
 */
export async function initCapacitor(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    // The app header uses a dark gradient, so use light status bar content.
    await StatusBar.setStyle({ style: Style.Dark });
    // Let the web view draw under the status bar; safe-area CSS handles padding.
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    // Status bar plugin may be unavailable on some platforms; ignore.
  }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    // No splash plugin / already hidden.
  }
}
