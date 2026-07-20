// js/router.js
const ROUTER = {
  screens: ['dashboard', 'scan', 'historial', 'recetas', 'costos', 'inventario', 'libro'],
  current: null,

  init() {
    window.addEventListener('hashchange', () => this.navigate(location.hash.slice(1)));
    document.querySelectorAll('.sb-item[data-screen]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.navigate(el.dataset.screen);
      });
    });
  },

  navigate(screen) {
    if (!this.screens.includes(screen)) screen = 'dashboard';
    if (!AUTH.canAccess(screen)) {
      const allowed = CONFIG.ROLE_SCREENS[(AUTH.get() || {}).role] || [];
      screen = allowed[0] || 'scan';
    }
    if (screen === this.current) return;
    this.current = screen;

    history.replaceState(null, '', '#' + screen);

    document.querySelectorAll('.sb-item[data-screen]').forEach(el => {
      el.classList.toggle('active', el.dataset.screen === screen);
    });

    document.querySelectorAll('.screen').forEach(el => {
      el.classList.toggle('active', el.id === 'screen-' + screen);
    });

    APP.renderScreen(screen);
  }
};
