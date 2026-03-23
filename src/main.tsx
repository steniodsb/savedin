import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { NotificationSystem } from "./lib/notifications";

// Initialize visual effects setting from localStorage before render
const VISUAL_EFFECTS_KEY = 'savedin_visual_effects_enabled';
const visualEffectsStored = localStorage.getItem(VISUAL_EFFECTS_KEY);
if (visualEffectsStored === 'false') {
  document.documentElement.setAttribute('data-visual-effects', 'disabled');
}

// Registrar Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registrado:', registration);
      })
      .catch((error) => {
        console.error('❌ Erro ao registrar Service Worker:', error);
      });
  });
}

// Restaurar notificações agendadas
if (NotificationSystem.isSupported()) {
  NotificationSystem.restoreScheduledNotifications();
}

createRoot(document.getElementById("root")!).render(<App />);
