// js/screens/libro.js — Libro de Costos: insumos + márgenes de recetas
const LIBRO = {
  _tab: 'recetas', // 'recetas' | 'insumos'
  _data: null,

  async render() {
    const el = document.getElementById('screen-libro');
    el.innerHTML = LIBRO._skeleton();
    try {
      const url = new URL(CONFIG.PEDIDOS_URL);
      url.searchParams.set('action', 'getLibroCostos');
      const res = await fetch(url.toString(), { redirect: 'follow' });
      LIBRO._data = await res.json();
      if (!LIBRO._data.ok) throw new Error(LIBRO._data.error);
      LIBRO._buildView(el);
    } catch(e) {
      el.innerHTML = `<div class="topbar"><div class="page-title">LIBRO DE COSTOS</div></div>
        <div style="padding:40px;color:var(--steel);font-family:'IBM Plex Mono',monospace;font-size:11px">Error: ${H(e.message)}</div>`;
    }
  },

  _buildView(el) {
    const { insumos, recetas } = LIBRO._data;
    el.innerHTML = `
      <div class="topbar" style="flex-direction:column;align-items:flex-start;gap:8px">
        <div class="page-title">LIBRO DE COSTOS</div>
        <div style="display:flex;gap:6px">
          <button id="lb-tab-recetas" class="btn ${LIBRO._tab==='recetas'?'btn-primary':'btn-secondary'}" style="padding:5px 12px;font-size:9px;letter-spacing:1px">RECETAS</button>
          <button id="lb-tab-insumos" class="btn ${LIBRO._tab==='insumos'?'btn-primary':'btn-secondary'}" style="padding:5px 12px;font-size:9px;letter-spacing:1px">INSUMOS</button>
        </div>
      </div>
      <div class="content" id="lb-content">${LIBRO._tab==='recetas' ? LIBRO._recetasHTML(recetas) : LIBRO._insumosHTML(insumos)}</div>`;

    el.querySelector('#lb-tab-recetas').addEventListener('click', () => { LIBRO._tab='recetas'; LIBRO._buildView(el); });
    el.querySelector('#lb-tab-insumos').addEventListener('click', () => { LIBRO._tab='insumos'; LIBRO._buildView(el); });
  },

  _recetasHTML(recetas) {
    if (!recetas.length) return '<p style="color:var(--steel);padding:20px;font-family:\'IBM Plex Mono\',monospace;font-size:10px">Sin recetas</p>';
    const sorted = [...recetas].sort((a, b) => b.margen - a.margen);
    return `<table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:10px">
      <thead><tr style="color:var(--steel);border-bottom:1px solid rgba(255,255,255,.1)">
        <th style="text-align:left;padding:8px 4px">PLATO</th>
        <th style="text-align:right;padding:8px 4px">VENTA</th>
        <th style="text-align:right;padding:8px 4px">COSTO</th>
        <th style="text-align:right;padding:8px 4px">MARGEN</th>
      </tr></thead>
      <tbody>${sorted.map(r => {
        const cls = r.margen >= 60 ? 'var(--ok)' : r.margen >= 45 ? 'var(--gold)' : 'var(--fire)';
        return `<tr style="border-bottom:1px solid rgba(255,255,255,.04)">
          <td style="padding:7px 4px;color:var(--bone)">${H(r.plato)}</td>
          <td style="text-align:right;padding:7px 4px;color:var(--steel)">${ENGINE.formatCOP(r.precioVenta)}</td>
          <td style="text-align:right;padding:7px 4px;color:var(--steel)">${ENGINE.formatCOP(Math.round(r.costoTotal))}</td>
          <td style="text-align:right;padding:7px 4px;color:${cls};font-weight:700">${r.margen}%</td>
        </tr>`;
      }).join('')}</tbody></table>`;
  },

  _insumosHTML(insumos) {
    if (!insumos.length) return '<p style="color:var(--steel);padding:20px;font-family:\'IBM Plex Mono\',monospace;font-size:10px">Sin insumos</p>';
    const cats = [...new Set(insumos.map(i => i.categoria))].sort();
    return cats.map(cat => {
      const items = insumos.filter(i => i.categoria === cat);
      return `<div style="margin-bottom:16px">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel);letter-spacing:1.5px;margin-bottom:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.08)">${H(cat)}</div>
        ${items.map(i => `<div style="display:flex;justify-content:space-between;padding:5px 0;font-family:'IBM Plex Mono',monospace;font-size:10px;border-bottom:1px solid rgba(255,255,255,.03)">
          <span style="color:var(--bone)">${H(i.nombre)}</span>
          <span style="color:${i.fechaUpdate ? 'var(--ok)' : 'var(--steel)'};text-align:right">
            ${ENGINE.formatCOP(i.precio)}/${i.unidad}${i.fechaUpdate ? ' ↑' : ''}
          </span>
        </div>`).join('')}
      </div>`;
    }).join('');
  },

  _skeleton() {
    return `<div class="topbar"><div class="page-title">LIBRO DE COSTOS</div></div>
      <div class="content">${Array(6).fill('<div class="skeleton" style="height:32px;margin-bottom:8px;border-radius:6px"></div>').join('')}</div>`;
  }
};
