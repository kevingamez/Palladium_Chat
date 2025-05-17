// tamagui.config.ts
import { createTamagui } from 'tamagui'
import { createInterFont } from '@tamagui/font-inter'
import { shorthands } from '@tamagui/shorthands'
import { themes, tokens } from '@tamagui/theme-base'

const headingFont = createInterFont()
const bodyFont = createInterFont()

const config = createTamagui({
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