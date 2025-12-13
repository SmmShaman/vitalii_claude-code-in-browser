/**
 * Debug utilities for the application
 * Control debug logging via Admin Panel -> Settings -> Debug
 */

const DEBUG_STORAGE_KEY = 'vitalii_debug_mode';

/**
 * Check if debug mode is enabled
 * Reads from localStorage, defaults to false
 */
export const isDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    return localStorage.getItem(DEBUG_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Enable or disable debug mode
 */
export const setDebugMode = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(DEBUG_STORAGE_KEY, enabled ? 'true' : 'false');

    // Notify user in console
    if (enabled) {
      console.log('%c🔧 DEBUG MODE ENABLED', 'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
      console.log('Refresh the page to see debug logs.');
    } else {
      console.log('%c🔇 DEBUG MODE DISABLED', 'background: #f44336; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
      console.log('Refresh the page to hide debug logs.');
    }
  } catch (error) {
    console.error('Failed to set debug mode:', error);
  }
};

/**
 * Debug logger - only logs when debug mode is enabled
 * Usage: debugLog('🎯 My message', { data: 123 })
 */
export const debugLog = (message: string, ...args: unknown[]): void => {
  if (!isDebugEnabled()) return;
  console.log(message, ...args);
};

/**
 * Debug warn - only warns when debug mode is enabled
 */
export const debugWarn = (message: string, ...args: unknown[]): void => {
  if (!isDebugEnabled()) return;
  console.warn(message, ...args);
};

/**
 * Debug error - always logs errors (important for debugging issues)
 */
export const debugError = (message: string, ...args: unknown[]): void => {
  console.error(message, ...args);
};
