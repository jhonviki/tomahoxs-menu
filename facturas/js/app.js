// js/app.js
const APP = {
  state: {
    facturas: [],
    items: [],
    recetas: [],
    dashboardData: null,
    loaded: {}
  },

  toast(msg, duration = 3000) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), duration);
  },

  async renderScreen(screen) {
    switch (screen) {
      case 'dashboard': await DASHBOARD.render(); break;
      case 'scan':      SCAN.render(); break;
      case 'historial': await HISTORIAL.render(); break;
      case 'recetas':   await RECETAS.render(); break;
      case 'costos':    await COSTOS.render(); break;
      case 'inventario': INV.render(); break;
      case 'libro':      await LIBRO.render(); break;
    }
  },

  async init() {
    AUTH.init();
    if (!AUTH.get()) {
      AUTH.showLogin();
      return;
    }
    AUTH.renderSidebar();
    ROUTER.init();
    const hash = location.hash.slice(1) || 'dashboard';
    ROUTER.navigate(hash);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }
};

document.addEventListener('DOMContentLoaded', () => APP.init());
