/**
 * Z-Index Scale System
 *
 * Centralized z-index values to prevent stacking context conflicts.
 * Use these constants instead of arbitrary z-index values.
 *
 * Scale:
 * - Base (0): Default stacking
 * - Elevated (10): Cards, slight elevation
 * - Dropdown (20): Dropdowns, popovers
 * - Sticky (30): Sticky headers, navigation
 * - Overlay (40): Modal backdrops, overlays
 * - Modal (50): Modal content, dialogs
 * - Popover (60): Tooltips, popovers above modals
 * - Toast (70): Toast notifications
 * - Skip Link (100): Accessibility skip link (always on top)
 */

export const Z_INDEX = {
  /** Default stacking level */
  base: 0,

  /** Cards with slight elevation */
  elevated: 10,

  /** Dropdown menus, select options */
  dropdown: 20,

  /** Sticky headers, floating elements */
  sticky: 30,

  /** Modal/dialog backdrops */
  overlay: 40,

  /** Modal/dialog content */
  modal: 50,

  /** Tooltips, popovers that appear above modals */
  popover: 60,

  /** Toast notifications */
  toast: 70,

  /** Accessibility skip link - always highest */
  skipLink: 100,
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;

/**
 * Get z-index class for Tailwind
 * @example getZClass('modal') // returns 'z-50'
 */
export function getZClass(level: ZIndexKey): string {
  return `z-[${Z_INDEX[level]}]`;
}
