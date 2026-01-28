import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

const DEFAULT_BROWSERS = ['chromium', 'firefox', 'webkit'] as const
type BrowserName = (typeof DEFAULT_BROWSERS)[number]

function getBrowserInstances() {
  const env = process.env.VITEST_BROWSERS
  const browsers = (
    env ? env.split(',').map((s) => s.trim()) : [...DEFAULT_BROWSERS]
  ).filter(Boolean) as BrowserName[]

  const unique = Array.from(new Set(browsers))
  return unique.map((browser) => ({ browser }))
}

export default defineConfig({
  test: {
    browser: {
      // Enable only when explicitly requested, so `pnpm test` can run in Node/CI
      enabled: process.env.VITEST_BROWSER === '1',
      // Force IPv4 loopback to avoid Firefox/IPv6 localhost quirks in some environments.
      // Override if you really need: VITEST_BROWSER_HOST=localhost
      api: {
        host: process.env.VITEST_BROWSER_HOST || '127.0.0.1',
      },
      provider: playwright(),
      // https://vitest.dev/config/browser/playwright
      // You can override browsers: VITEST_BROWSERS=chromium,firefox,webkit
      instances: getBrowserInstances(),
    },
  },
})
