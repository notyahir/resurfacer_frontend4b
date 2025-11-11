import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { initializeSession } from './services/session'

initializeSession()

createApp(App).mount('#app')
