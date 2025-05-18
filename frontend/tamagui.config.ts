import { createTamagui, createFont } from 'tamagui';
import { shorthands } from '@tamagui/shorthands';
import { themes, tokens } from '@tamagui/themes';

const robotoFont = createFont({
  family: 'Roboto, system-ui, sans-serif',
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 40,
    10: 48,
  },
  lineHeight: {
    1: 16,
    2: 20,
    3: 22,
    4: 24,
    5: 28,
    6: 32,
    7: 36,
    8: 40,
    9: 48,
    10: 56,
  },
  weight: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    bold: '700',
    heavy: '900',
  },
  letterSpacing: {
    1: 0,
    2: -0.5,
    3: -0.5,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: -1,
    9: -2,
    10: -3,
  },
});

const config = createTamagui({
  defaultTheme: 'light',
  fonts: {
    heading: robotoFont,
    body: robotoFont,
  },
  shorthands,
  themes,
  tokens,
});

export type AppConfig = typeof config;
export default config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}
