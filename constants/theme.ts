/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const baseLight = {
  text: '#0F1223',
  background: '#F5F7FB',
  tint: '#7C3AED',
  icon: '#7C8DA6',
  tabIconDefault: '#B4BCD4',
  tabIconSelected: '#7C3AED',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF1FB',
  card: '#FFFFFF',
  cardElevated: '#E4E8F5',
  border: 'rgba(6, 13, 33, 0.08)',
  accent: '#7C3AED',
  accentSecondary: '#0EA5E9',
  accentTertiary: '#10B981',
  danger: '#F87171',
  success: '#22C55E',
  warning: '#FACC15',
  info: '#38BDF8',
  muted: '#94A3B8',
  glass: 'rgba(255, 255, 255, 0.6)',
};

const baseDark = {
  text: '#F5F7FF',
  background: '#030711',
  tint: '#A78BFA',
  icon: '#9DA4C2',
  tabIconDefault: '#3F4767',
  tabIconSelected: '#C084FC',
  surface: 'rgba(255, 255, 255, 0.03)',
  surfaceMuted: 'rgba(255, 255, 255, 0.02)',
  card: '#0B1120',
  cardElevated: '#131A32',
  border: 'rgba(255, 255, 255, 0.08)',
  accent: '#8B5CF6',
  accentSecondary: '#22D3EE',
  accentTertiary: '#4ADE80',
  danger: '#F87171',
  success: '#4ADE80',
  warning: '#FACC15',
  info: '#38BDF8',
  muted: '#A5B4CF',
  glass: 'rgba(13, 20, 40, 0.75)',
};

export const Colors = {
  light: baseLight,
  dark: baseDark,
};

export const Gradients = {
  aurora: ['#1A1C3A', '#2F296B', '#4C1D95'],
  pulse: ['#5B21B6', '#7C3AED', '#DB2777'],
  oceanic: ['#022C43', '#053F5C', '#1F6F8B'],
  citrus: ['#FF7E5F', '#FD3A84', '#7F00FF'],
  midnight: ['#030711', '#0F172A', '#1E1B4B'],
  // Light theme gradients
  light: ['#F5F7FB', '#E8EDF5', '#D1DBE8'],
  lightBlue: ['#E0F2FE', '#BAE6FD', '#7DD3FC'],
  lightPurple: ['#F3E8FF', '#E9D5FF', '#DDD6FE'],
} as const;

export type ThemeColorSet = typeof baseLight;

export const Fonts = Platform.select({
  ios: {
    sans: 'Poppins_400Regular',
    serif: 'Poppins_400Regular',
    rounded: 'Poppins_400Regular',
    mono: 'monospace',
  },
  default: {
    sans: 'Poppins_400Regular',
    serif: 'Poppins_400Regular',
    rounded: 'Poppins_400Regular',
    mono: 'monospace',
  },
  web: {
    sans: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "'Poppins', Georgia, 'Times New Roman', serif",
    rounded: "'Poppins', 'SF Pro Rounded', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const FontFamily = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extraBold: 'Poppins_800ExtraBold',
};
