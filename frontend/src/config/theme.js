/**
 * Theme Configuration
 * Centralized theme configuration for easy customization
 */

// Primary color in OKLCH format
// To change the primary color, update these values
// Use an OKLCH color converter: https://oklch.com/
export const themeConfig = {
  // Primary color: #8a4da2 (purple/magenta)
  primary: {
    light: "oklch(0.55 0.18 310)", // Light mode
    dark: "oklch(0.65 0.20 310)", // Dark mode
  },

  // You can add more theme colors here
  colors: {
    success: "oklch(0.7459 0.1483 156.4499)",
    warning: "oklch(0.7336 0.1758 50.5517)",
    error: "oklch(0.629 0.1902 23.0704)",
    info: "oklch(0.5828 0.1809 259.7276)",
  },
};

export default themeConfig;

