const AUTH = {
  SESSION_KEY: 'toma_session',

  get() {
    try { return JSON.parse(localStorage.getItem(AUTH.SESSION_KEY)); } catch { return null; }
  },

  login(user, pass) {
    const u = CONFIG.USERS[user.toLowerCase()];
    if (!u || u.pass !== pass) return false;
    localStorage.setItem(AUTH.SESSION_KEY, JSON.stringify({ user: user.toLowerCase(), role: u.role }));
    return true;
  },

  logout() {
    localStorage.removeItem(AUTH.SESSION_KEY);
    location.reload();
  },

  canAccess(screen) {
    const s = AUTH.get();
    if (!s) return false;
    return (CONFIG.ROLE_SCREENS[s.role] || []).includes(screen);
  },

  showLogin() {
    document.getElementById('login-overlay').classList.add('visible');
  },

  hideLogin() {
    document.getElementById('login-overlay').classList.remove('visible');
  },

  renderSidebar() {
    const s = AUTH.get();
    if (!s) return;
    const allowed = CONFIG.ROLE_SCREENS[s.role] || [];
    document.querySelectorAll('.sb-item[data-screen]').forEach(el => {
      el.style.display = allowed.includes(el.dataset.screen) ? '' : 'none';
    });
    const avatar = document.querySelector('.sb-avatar');
    if (avatar) {
      avatar.title = s.user + ' (' + s.role + ')';
      avatar.style.cursor = 'pointer';
      avatar.onclick = () => { if (confirm('¿Cerrar sesión?')) AUTH.logout(); };
    }
  },

  init() {
    document.getElementById('login-form').addEventListener('submit', e => {
      e.preventDefault();
      const user = document.getElementById('login-user').value.trim();
      const pass = document.getElementById('login-pass').value;
      if (AUTH.login(user, pass)) {
        AUTH.hideLogin();
        AUTH.renderSidebar();
        ROUTER.init();
        const first = (CONFIG.ROLE_SCREENS[AUTH.get().role] || ['scan'])[0];
        ROUTER.navigate(first);
      } else {
        document.getElementById('login-error').textContent = 'Usuario o contraseña incorrectos';
      }
    });
  }
};
