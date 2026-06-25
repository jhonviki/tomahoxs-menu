// js/screens/dashboard.js
const DASHBOARD = {
  async render() {
    const el = document.getElementById('screen-dashboard');
    el.innerHTML = DASHBOARD.skeleton();

    let dash, recetas, items;
    try {
      [dash, recetas] = await Promise.all([
        API.get('getDashboard', { mes: CONFIG.MES_ACTUAL }),
        API.get('getRecetas')
      ]);
      items = [];
      if (dash.facturas) {
        const allFact = await API.get('getFacturas', {});
        // Limitar a 10 facturas y cargar en paralelo (antes: 20 en serie — hasta 6 s)
        const slice = (Array.isArray(allFact) ? allFact : []).slice(0, 10);
        const detalles = await Promise.all(slice.map(f => API.get('getFactura', { id: f.id })));
        for (const fd of detalles) {
          if (fd.items) items.push(...fd.items);
        }
      }
      APP.state.dashboardData = dash;
      APP.state.recetas = Array.isArray(recetas) ? recetas : [];
      APP.state.items = items;
    } catch(e) {
      console.error('dashboard:', e);
      el.innerHTML = `<div style="padding:40px;color:var(--steel);font-family:'IBM Plex Mono',monospace;font-size:11px">Error al cargar el dashboard</div>`;
      return;
    }

    const margenesRecetas = APP.state.recetas.map(r => ({
      ...r,
      ...ENGINE.calcReceta(r, items)
    })).filter(r => r.ok);

    const alertas = margenesRecetas.filter(r => r.alerta);
    const margenProm = margenesRecetas.length
      ? Math.round(margenesRecetas.reduce((s, r) => s + r.margenPct, 0) / margenesRecetas.length)
      : null;

    el.innerHTML = `
      <div class="topbar">
        <div>
          <div class="page-title">DASHBOARD</div>
        </div>
        <button id="dash-scan-btn" class="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7V1h-6M1 7V1h6M23 17v6h-6M1 17v6h6"/></svg>
          ESCANEAR
        </button>
      </div>
      <div class="content">
        ${alertas.length ? `<div style="background:rgba(232,68,10,.08);border:1px solid rgba(232,68,10,.2);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--ember)">
          ⚠ ${alertas.length} plato${alertas.length > 1 ? 's' : ''} con margen bajo el target: ${alertas.map(r => H(r.nombre)).join(', ')}
        </div>` : ''}

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">GASTO MES</div>
            <div class="kpi-value fire">${ENGINE.formatCOP(dash.total || 0)}</div>
            <div class="kpi-sub">${CONFIG.MES_ACTUAL}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">FACTURAS</div>
            <div class="kpi-value">${dash.count || 0}</div>
            <div class="kpi-sub">este mes</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">PROVEEDORES</div>
            <div class="kpi-value">${dash.proveedores_count || 0}</div>
            <div class="kpi-sub">activos</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">MARGEN PROM</div>
            <div class="kpi-value ${margenProm >= 60 ? 'ok' : margenProm >= 45 ? 'gold' : 'fire'}">${margenProm != null ? margenProm + '%' : '—'}</div>
            <div class="kpi-sub">recetas activas</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <div class="card">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel);letter-spacing:1.5px;margin-bottom:12px">ÚLTIMAS FACTURAS</div>
            ${(dash.facturas || []).map(f => `
              <div data-nav="historial" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer">
                <div>
                  <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--bone)">${H(f.proveedor) || 'Sin nombre'}</div>
                  <div style="font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--steel);margin-top:2px">${f.fecha || ''}</div>
                </div>
                <span class="amount">${ENGINE.formatCOP(f.total)}</span>
              </div>
            `).join('') || '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;color:var(--steel);padding:20px 0;text-align:center">Sin facturas aún</div>'}
          </div>

          <div class="card">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel);letter-spacing:1.5px;margin-bottom:12px">MÁRGENES POR PLATO</div>
            ${margenesRecetas.sort((a,b) => a.margenPct - b.margenPct).slice(0, 6).map(r => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.03)">
                <span style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--bone)">${H(r.nombre)}</span>
                <span class="badge-margin ${ENGINE.margenClass(r.margenPct)}">${r.margenPct}%</span>
              </div>
            `).join('') || '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;color:var(--steel);padding:20px 0;text-align:center">Carga facturas para ver márgenes</div>'}
          </div>
        </div>
      </div>
    `;

    document.getElementById('dash-scan-btn').addEventListener('click', () => ROUTER.navigate('scan'));
    el.addEventListener('click', e => {
      const row = e.target.closest('[data-nav]');
      if (row) ROUTER.navigate(row.dataset.nav);
    });
  },

  skeleton() {
    return `
      <div class="topbar"><div class="page-title">DASHBOARD</div></div>
      <div class="content">
        <div class="kpi-grid">
          ${Array(4).fill('<div class="kpi-card"><div class="skeleton" style="height:12px;width:60%;margin-bottom:8px"></div><div class="skeleton" style="height:28px;width:80%"></div></div>').join('')}
        </div>
      </div>`;
  }
};
