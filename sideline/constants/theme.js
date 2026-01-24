/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * All colors are carefully chosen to ensure excellent readability and contrast in both modes.
 */

import { Platform } from 'react-native';

const tintColorLight = '#3B6FA8'; // Blue with good contrast
const tintColorDark = '#5BA3F5'; // Lighter blue for dark mode visibility

export const Colors = {
  light: {
    text: '#1A1A1A', // Very dark gray for excellent readability
    textSecondary: '#666666', // Secondary text with good contrast
    background: '#FFFFFF', // Pure white
    backgroundSecondary: '#F5F5F5', // Slightly gray for cards/sections
    tint: tintColorLight,
    border: '#E0E0E0', // Subtle borders
    icon: '#666666',
    tabIconDefault: '#999999',
    tabIconSelected: tintColorLight,
    cardBackground: '#FFFFFF',
    inputBackground: '#F8F8F8',
    placeholder: '#999999',
    error: '#DC3545',
    success: '#28A745',
    warning: '#FFC107',
  },
  dark: {
    text: '#FFFFFF', // Pure white for dark backgrounds
    textSecondary: '#B0B0B0', // Light gray with good contrast
    background: '#000000', // True black for OLED and contrast
    backgroundSecondary: '#1C1C1E', // Dark gray for cards/sections
    tint: tintColorDark,
    border: '#3A3A3C', // Visible borders in dark mode
    icon: '#B0B0B0',
    tabIconDefault: '#8E8E93',
    tabIconSelected: tintColorDark,
    cardBackground: '#1C1C1E',
    inputBackground: '#2C2C2E',
    placeholder: '#8E8E93',
    error: '#FF6B6B',
    success: '#51CF66',
    warning: '#FFD43B',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS UIFontDescriptorSystemDesignDefault */
    sans: 'system-ui',
    /** iOS UIFontDescriptorSystemDesignSerif */
    serif: 'ui-serif',
    /** iOS UIFontDescriptorSystemDesignRounded */
    rounded: 'ui-rounded',
    /** iOS UIFontDescriptorSystemDesignMonospaced */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
