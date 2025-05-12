import App from './App.vue'
import router from './router'
import '~/assets/styles/tailwind.css'

// Import locale messages
import en from '~/locales/en.json'
import ru from '~/locales/ru.json'

// Use our CSP-safe configuration
import { configureSafeApp } from './csp-safe'

// Initialize the app with CSP-safe settings
const app = configureSafeApp(App, router, { en, ru })

// Mount app
app.mount('#app')
