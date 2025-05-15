import { defineManifest } from '@crxjs/vite-plugin'
import packageJson from '../package.json'

const { version, name, description } = packageJson

// Convert from Semver (example: 0.1.0-beta6)
const [major, minor, patch, label = '0'] = version
  .replace(/[^\d.-]/g, '')
  .split(/[.-]/)

export default defineManifest(async (env) => ({
  manifest_version: 3,
  name: env.mode === 'staging' ? `[INTERNAL] ${name}` : 'Web Check',
  description: description || 'Track changes on web pages with minimal effort',
  // up to four numbers separated by dots
  version: `${major}.${minor}.${patch}.${label}`,
  // semver is OK in "version_name"
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
  // Используем только базовый content-script для проверки изменений
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/content-script/index.ts']
    }
  ],
  // CSP для MV3 - максимально строгая, без unsafe-eval
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline';"
  },
  permissions: [
    'storage',
    'alarms',
    'notifications',
    'scripting',
    'activeTab',
    'tabs',
    'tabCapture'
  ],
  host_permissions: [
    'http://*/*',
    'https://*/*',
    '<all_urls>'
  ],
  web_accessible_resources: [
    {
      resources: [
        'content-script/*',
        'icons/*'
      ],
      matches: ['<all_urls>']
    }
  ]
}))
