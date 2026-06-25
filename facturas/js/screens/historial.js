// js/screens/historial.js
const HISTORIAL = {
  // Estado inicial declarado sin CONFIG.MES_ACTUAL para evitar evaluación estática.
  // Se reinicializa en render() para garantizar estado limpio en cada navegación.
  state: { facturas: [], selected: null, mesFilter: '', busqueda: '' },

  async render() {
    // Reinicializar estado en cada navegación para evitar filtros y selección residuales
    HISTORIAL.state = { facturas: [], selected: null, mesFilter: CONFIG.MES_ACTUAL, busqueda: '' };
    const el = document.getElementById('screen-historial');
    el.innerHTML = HISTORIAL.buildShell();
    document.getElementById('hist-scan-btn').addEventListener('click', () => ROUTER.navigate('scan'));
    document.getElementById('hist-search').addEventListener('input', e => HISTORIAL.filtrar(e.target.value));
    document.getElementById('hist-csv-btn').addEventListener('click', () => HISTORIAL.exportCSV());
    document.getElementById('hist-mes-chips').addEventListener('click', e => {
      const chip = e.target.closest('[data-mes]');
      if (chip) HISTORIAL.cambiarMes(chip.dataset.mes);
    });
    document.getElementById('hist-table-wrap').addEventListener('click', e => {
      const row = e.target.closest('[data-id]');
      if (row) HISTORIAL.selectFactura(row.dataset.id);
    });
    document.getElementById('hist-detail').addEventListener('click', e => {
      const btn = e.target.closest('[data-borrar]');
      if (btn) HISTORIAL.borrar(btn.dataset.borrar);
    });
    await HISTORIAL.loadFacturas();
  },

  buildShell() {
    return `
      <div class="topbar">
        <div class="page-title">HISTORIAL</div>
        <button id="hist-scan-btn" class="btn btn-primary">+ ESCANEAR</button>
      </div>
      <div style="padding:10px 24px;border-bottom:1px solid var(--coal);display:flex;gap:8px;align-items:center;flex-shrink:0">
        <div style="flex:1;background:var(--ash);border:1px solid var(--coal);border-radius:6px;padding:6px 10px;display:flex;gap:6px;align-items:center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--steel)" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input id="hist-search" class="input-field" style="border:none;background:transparent;padding:0;font-size:10px" placeholder="Buscar proveedor o producto...">
        </div>
        <div id="hist-mes-chips" style="display:flex;gap:6px"></div>
        <button id="hist-csv-btn" class="btn btn-secondary" style="font-size:10px">⬇ CSV</button>
      </div>
      <div id="hist-stats" style="display:flex;border-bottom:1px solid var(--coal);flex-shrink:0"></div>
      <div style="display:flex;flex:1;overflow:hidden">
        <div id="hist-table-wrap" class="table-wrap" style="flex:1"></div>
        <div id="hist-detail" style="width:240px;border-left:1px solid var(--coal);background:var(--ash);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden">
          <div style="padding:40px 20px;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--steel)">Selecciona una factura</div>
        </div>
      </div>
    `;
  },

  async loadFacturas() {
    try {
      const data = await API.get('getFacturas', { mes: HISTORIAL.state.mesFilter });
      HISTORIAL.state.facturas = Array.isArray(data) ? data : [];
      HISTORIAL.buildMesChips();
      HISTORIAL.renderTable();
      HISTORIAL.renderStats();
    } catch(e) {
      console.error('historial loadFacturas:', e);
      document.getElementById('hist-table-wrap').innerHTML = `<div style="padding:20px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--steel)">Error al cargar facturas</div>`;
    }
  },

  buildMesChips() {
    const meses = [CONFIG.MES_ACTUAL];
    const prev = new Date();
    prev.setMonth(prev.getMonth() - 1);
    meses.push(prev.toISOString().substring(0, 7));
    const container = document.getElementById('hist-mes-chips');
    container.innerHTML = [...meses, null].map(m => {
      const active = (m || '') === HISTORIAL.state.mesFilter;
      return `
      <div data-mes="${m || ''}" style="background:${active ? 'rgba(232,68,10,.15)' : 'var(--ash)'};border:1px solid ${active ? 'var(--fire)' : 'var(--coal)'};border-radius:20px;padding:4px 10px;font-family:'IBM Plex Mono',monospace;font-size:9px;color:${active ? 'var(--ember)' : 'var(--steel)'};cursor:pointer;white-space:nowrap">
        ${m ? m.substring(5) + '/' + m.substring(0, 4) : 'TODOS'}
      </div>
      `;
    }).join('');
  },

  async cambiarMes(mes) {
    HISTORIAL.state.mesFilter = mes;
    await HISTORIAL.loadFacturas();
  },

  filtrar(q) {
    HISTORIAL.state.busqueda = q.toLowerCase();
    HISTORIAL.renderTable();
  },

  filtered() {
    const q = HISTORIAL.state.busqueda;
    if (!q) return HISTORIAL.state.facturas;
    return HISTORIAL.state.facturas.filter(f =>
      (f.proveedor || '').toLowerCase().includes(q)
    );
  },

  renderStats() {
    const f = HISTORIAL.state.facturas;
    const total = f.reduce((s, x) => s + Number(x.total || 0), 0);
    const provs = new Set(f.map(x => x.proveedor).filter(Boolean)).size;
    const maxFact = f.reduce((max, x) => Math.max(max, Number(x.total || 0)), 0);
    document.getElementById('hist-stats').innerHTML = [
      ['FACTURAS', f.length],
      ['TOTAL MES', ENGINE.formatCOP(total)],
      ['PROVEEDORES', provs],
      ['MAYOR', ENGINE.formatCOP(maxFact)]
    ].map(([label, val]) => `
      <div style="flex:1;padding:8px 16px;border-right:1px solid var(--coal)">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--steel);letter-spacing:1px;margin-bottom:2px">${label}</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:var(--bone)">${val}</div>
      </div>
    `).join('');
  },

  renderTable() {
    const rows = HISTORIAL.filtered();
    const COLORS = ['#E8440A','#FF6B1A','#3DBA6A','#F5A623','#4FC3F7','#9C27B0','#FF5722'];
    const provColor = {};
    [...new Set(rows.map(r => r.proveedor))].forEach((p, i) => provColor[p] = COLORS[i % COLORS.length]);

    const tagMap = { IA: 'tag-ia', EDITADA: 'tag-editada', MANUAL: 'tag-manual' };
    const tagText = { IA: '✦ IA', EDITADA: '✏ EDITADA', MANUAL: 'MANUAL' };

    document.getElementById('hist-table-wrap').innerHTML = `
      <table>
        <thead><tr><th>PROVEEDOR</th><th>FECHA</th><th>ÍTEMS</th><th>FUENTE</th><th style="text-align:right">TOTAL</th></tr></thead>
        <tbody>
          ${rows.map(f => `
            <tr data-id="${f.id}" class="${HISTORIAL.state.selected?.id === f.id ? 'selected' : ''}" style="cursor:pointer">
              <td><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${provColor[f.proveedor]||'var(--steel)'};margin-right:6px;vertical-align:middle"></span>${H(f.proveedor) || '—'}</td>
              <td>${f.fecha || '—'}</td>
              <td>${f.items_count || 0} items</td>
              <td><span class="tag ${tagMap[f.fuente] || 'tag-manual'}">${tagText[f.fuente] || f.fuente || '—'}</span></td>
              <td style="text-align:right"><span class="amount">${ENGINE.formatCOP(f.total)}</span></td>
            </tr>
          `).join('') || '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--steel);font-size:10px">Sin facturas para este período</td></tr>'}
        </tbody>
      </table>
    `;
  },

  async selectFactura(id) {
    const detail = document.getElementById('hist-detail');
    detail.innerHTML = `<div style="padding:20px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--steel)">Cargando...</div>`;
    try {
      const factura = await API.get('getFactura', { id });
      HISTORIAL.state.selected = factura;
      HISTORIAL.renderTable();
      detail.innerHTML = `
        <div style="padding:12px 14px;border-bottom:1px solid var(--coal)">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:var(--bone)">${H(factura.proveedor) || '—'}</div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel);margin-top:2px">${H(factura.fecha) || ''}</div>
        </div>
        <div style="flex:1;overflow-y:auto;padding:10px 14px">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--steel);letter-spacing:1px;margin-bottom:8px">ÍTEMS</div>
          ${(factura.items || []).map(item => `
            <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)">
              <div>
                <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--bone)">${H(item.producto)}</div>
                <div style="font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--steel)">${H(item.cantidad)} ${H(item.unidad)} × ${ENGINE.formatCOPFull(item.precio_unidad)}</div>
              </div>
              <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel)">${ENGINE.formatCOP(item.total)}</div>
            </div>
          `).join('')}
        </div>
        <div style="padding:8px 14px;border-top:1px solid var(--fire);flex-shrink:0">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--steel)">TOTAL</span>
            <span class="amount large">${ENGINE.formatCOPFull(factura.total)}</span>
          </div>
          <button data-borrar="${factura.id}" class="btn btn-secondary" style="width:100%;font-size:9px;color:var(--ember);border-color:rgba(232,68,10,.3)">✕ BORRAR FACTURA</button>
        </div>
      `;
    } catch(e) {
      console.error('historial selectFactura:', e);
      detail.innerHTML = `<div style="padding:20px;font-size:10px;color:var(--steel);font-family:'IBM Plex Mono',monospace">Error al cargar factura</div>`;
    }
  },

  async borrar(id) {
    if (!confirm('¿Borrar esta factura? Esta acción no se puede deshacer.')) return;
    try {
      await API.post({ action: 'borrarFactura', id });
      HISTORIAL.state.selected = null;
      document.getElementById('hist-detail').innerHTML = '<div style="padding:40px 20px;text-align:center;font-family:\'IBM Plex Mono\',monospace;font-size:10px;color:var(--steel)">Selecciona una factura</div>';
      APP.toast('✓ Factura borrada');
      await HISTORIAL.loadFacturas();
    } catch(e) {
      APP.toast('Error al borrar: ' + e.message);
    }
  },

  exportCSV() {
    const rows = HISTORIAL.filtered();
    const csv = ['ID,Fecha,Proveedor,Total,Fuente,Items',
      ...rows.map(f => `${f.id},${f.fecha},${f.proveedor},${f.total},${f.fuente},${f.items_count}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `facturas-${HISTORIAL.state.mesFilter || 'todas'}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }
};
