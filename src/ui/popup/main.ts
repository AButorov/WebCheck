import App from './App.vue'
import router from './router'
import '~/assets/styles/tailwind.css'
import { createPinia } from 'pinia'

// Import locale messages
import en from '~/locales/en.json'
import ru from '~/locales/ru.json'

// Use our CSP-safe configuration
import { configureSafeApp } from './csp-safe'

console.log('[POPUP] Starting popup initialization...')
console.log('[POPUP] App component:', App)
console.log('[POPUP] Router:', router)

// Initialize Pinia
const pinia = createPinia()
console.log('[POPUP] Pinia initialized')

// Initialize the app with CSP-safe settings
const app = configureSafeApp(App, router, { en, ru })
console.log('[POPUP] App created with CSP-safe settings')

// Use Pinia
app.use(pinia)
console.log('[POPUP] Pinia attached to app')

// Mount app
console.log('[POPUP] Mounting app to #app element...')
console.log('[POPUP] HTML structure:', document.body.innerHTML)
app.mount('#app')
console.log('[POPUP] App mounted')
