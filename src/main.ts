import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'

// 앱 전역 날씨 상태를 공유하기 위해 Pinia store를 등록합니다.
createApp(App).use(createPinia()).mount('#app')
