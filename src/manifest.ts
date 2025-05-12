import { defineManifest } from '@crxjs/vite-plugin'
import packageJson from '../package.json'

const { version } = packageJson

// Convert from Semver (example: 0.1.0-beta6)
const [major, minor, patch] = version
  .replace(/[^\d.-]/g, '')
  .split(/[.-]/)
  .map(Number)

export default defineManifest(async () => ({
  manifest_version: 3,
  name: 'Web Check',
  description: 'Track changes on web pages with minimal effort',
  version: `${major}.${minor}.${patch}`,
  version_name: version,
  icons: {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  },
  action: {
    default_popup: 'src/ui/popup/index.html',
    default_icon: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
  },
  options_page: 'src/ui/options/index.html',
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/content-script/index.ts'],
    },
  ],
  // Обновлена CSP без использования unsafe-eval
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline';"
  },
  permissions: [
    'storage',
    'alarms',
    'notifications',
    'scripting',
    'activeTab',
  ],
  host_permissions: [
    'http://*/*',
    'https://*/*',
  ],
}))
