import { createTamagui } from 'tamagui'
import { createInterFont } from '@tamagui/font-inter'
import { shorthands } from '@tamagui/shorthands'
import { themes, tokens } from '@tamagui/themes'

const headingFont = createInterFont()
const bodyFont = createInterFont()

const config = createTamagui({
  defaultTheme: 'light',
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  shorthands,
  themes,
  tokens,
})

export type AppConfig = typeof config
export default config

// ensure types work
declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}