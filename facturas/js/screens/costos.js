const COSTOS = {
  TARGETS: { mano_obra: 25, arriendo: 10, servicios: 5, publicidad: 5, otros: 5, cmv: 35 },
  LABELS:  { mano_obra: 'Mano de obra', arriendo: 'Arriendo', servicios: 'Servicios públicos', publicidad: 'Publicidad', otros: 'Otros', cmv: 'CMV (recetas)' },
  _detalle: [],

  async render() {
    const el = document.getElementById('screen-costos');
    el.innerHTML = COSTOS.skeleton();

    const mes = CONFIG.MES_ACTUAL;
    let costos = {}, cmvTotal = 0, cmvRecetas = 0, cmvOtros = 0, ventas = 0;

    try {
      const pedidosTimeout = new Promise(r => setTimeout(() => r({ pedidos: [] }), 8000));
      const [costosData, dash, pedidosData, recetasData, facturasData] = await Promise.all([
        API.get('getCostos', { mes }),
        API.get('getDashboard', { mes }),
        Promise.race([
          fetch(CONFIG.PEDIDOS_URL + '?action=getPedidos').then(r => r.json()).catch(() => ({ pedidos: [] })),
          pedidosTimeout
        ]),
        API.get('getRecetas').catch(() => []),
        API.get('getFacturas', {}).catch(() => [])
      ]);
      costos = costosData || {};
      cmvTotal = dash.total || 0;
      if (costos.ventas_loggro && Number(costos.ventas_loggro) > 0) {
        ventas = Number(costos.ventas_loggro);
      } else {
        const pedidos = pedidosData.pedidos || [];
        ventas = pedidos
          .filter(p => (p.Fecha || '').substring(0, 7) === mes)
          .reduce((s, p) => s + Number((p.Total || '0').toString().replace(/[^0-9]/g, '') || 0), 0);
      }
      // Restaurar detalle guardado
      try { COSTOS._detalle = costos.ventas_detalle ? JSON.parse(costos.ventas_detalle) : []; } catch { COSTOS._detalle = []; }
      const facturasDelMes = (Array.isArray(facturasData) ? facturasData : [])
        .filter(f => (f.fecha || '').substring(0, 7) === mes);
      if (facturasDelMes.length > 0 && Array.isArray(recetasData) && recetasData.length > 0) {
        const detalles = await Promise.all(
          facturasDelMes.slice(0, 30).map(f => API.get('getFactura', { id: f.id }).catch(() => ({})))
        );
        const allItems = detalles.flatMap(d => d.items || []);
        const allIngredientes = recetasData.flatMap(r => r.ingredientes || []);
        for (const item of allItems) {
          const val = Number(item.total || (item.cantidad || 0) * (item.precio_unidad || 0));
          if (allIngredientes.some(ing => ENGINE.matchIngrediente(ing.producto, [item]))) {
            cmvRecetas += val;
          } else {
            cmvOtros += val;
          }
        }
      }
      if (cmvRecetas + cmvOtros === 0) cmvRecetas = cmvTotal;
    } catch(e) {
      console.error('costos:', e);
      el.innerHTML = `<div style="padding:40px;color:var(--steel);font-family:'IBM Plex Mono',monospace;font-size:11px">Error al cargar P&amp;L</div>`;
      return;
    }

    const costosAjustados = { ...costos, otros: Number(costos.otros || 0) + cmvOtros };

    el.innerHTML = `
      <div class="topbar">
        <div><div class="page-title">P&L — ${mes}</div></div>
      </div>
      <div class="content">

        <div class="kpi-grid" style="margin-bottom:20px">
          <div class="kpi-card">
            <div class="kpi-label">VENTAS MES</div>
            <div class="kpi-value ok">${ENGINE.formatCOP(ventas)}</div>
            <div class="kpi-sub">${costos.ventas_loggro > 0 ? 'Loggro' : 'bot WhatsApp'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">CMV</div>
            <div class="kpi-value ${ventas ? (cmvRecetas/ventas*100 <= 38 ? 'ok' : 'fire') : ''}">${ventas ? Math.round(cmvRecetas/ventas*100) + '%' : '—'}</div>
            <div class="kpi-sub">${ENGINE.formatCOP(cmvRecetas)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">UTILIDAD</div>
            ${COSTOS._utilidadKpi(ventas, cmvRecetas, costosAjustados)}
          </div>
          <div class="kpi-card">
            <div class="kpi-label">TOTAL COSTOS</div>
            ${COSTOS._totalCostosKpi(ventas, cmvRecetas, costosAjustados)}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">

          <div class="card">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel);letter-spacing:1.5px;margin-bottom:14px">INGRESAR COSTOS DEL MES</div>

            <div style="margin-bottom:16px;padding:10px;background:rgba(200,169,110,.07);border:1px solid rgba(200,169,110,.2);border-radius:8px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--gold);letter-spacing:1.5px">VENTAS LOGGRO</div>
                <label class="btn btn-secondary" style="padding:5px 10px;cursor:pointer;font-size:8px">
                  📂 SUBIR REPORTE
                  <input id="costos-loggro-file" type="file" accept=".csv,.xlsx,.xls,.pdf,image/*" style="display:none">
                </label>
              </div>
              <input id="costo-ventas_loggro" type="number" min="0" value="${costos.ventas_loggro || ''}" placeholder="0 — o sube el Excel de Loggro"
                style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(200,169,110,.3);border-radius:6px;padding:8px 10px;color:var(--bone);font-family:'IBM Plex Mono',monospace;font-size:11px;box-sizing:border-box;margin-bottom:8px">
              <div id="loggro-status" style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel);min-height:10px;margin-bottom:4px"></div>
              <div id="loggro-detalle">${COSTOS._detalleHTML(COSTOS._detalle)}</div>
            </div>

            ${['mano_obra','arriendo','servicios','publicidad','otros'].map(k => `
              <div style="margin-bottom:12px">
                <label style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel);display:block;margin-bottom:4px">${COSTOS.LABELS[k].toUpperCase()} (target ${COSTOS.TARGETS[k]}%)</label>
                <input id="costo-${k}" type="number" min="0" value="${costos[k] || ''}" placeholder="0"
                  style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:8px 10px;color:var(--bone);font-family:'IBM Plex Mono',monospace;font-size:11px;box-sizing:border-box">
              </div>
            `).join('')}
            <button id="costos-guardar-btn" class="btn btn-primary" style="width:100%;margin-top:4px">GUARDAR</button>
          </div>

          <div class="card">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel);letter-spacing:1.5px;margin-bottom:14px">ESTRUCTURA VS TARGET</div>
            ${COSTOS._tabla(ventas, cmvRecetas, costosAjustados)}
          </div>

        </div>
      </div>`;

    document.getElementById('costos-guardar-btn').addEventListener('click', () => COSTOS.guardar(mes));
    document.getElementById('costos-loggro-file').addEventListener('change', function() { COSTOS.parsearReporte(this); });
  },

  _detalleHTML(detalle) {
    if (!detalle || !detalle.length) return '';
    const total = detalle.reduce((s, r) => s + r.total, 0);
    return `
      <table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:8px;margin-top:4px">
        ${detalle.map(r => {
          const pct = total ? Math.round(r.total / total * 100) : 0;
          return `<tr style="border-top:1px solid rgba(200,169,110,.1)">
            <td style="padding:4px 0;color:var(--bone)">${H(r.metodo)}</td>
            <td style="text-align:right;color:var(--steel);padding-right:8px">${pct}%</td>
            <td style="text-align:right;color:var(--gold)">${ENGINE.formatCOPFull(r.total)}</td>
          </tr>`;
        }).join('')}
        <tr style="border-top:1px solid rgba(200,169,110,.3)">
          <td style="padding:4px 0;color:var(--bone);font-weight:700">TOTAL</td>
          <td></td>
          <td style="text-align:right;color:var(--gold);font-weight:700">${ENGINE.formatCOPFull(total)}</td>
        </tr>
      </table>`;
  },

  _pct(valor, ventas) {
    if (!ventas || !valor) return null;
    return Math.round(valor / ventas * 100);
  },

  _badge(real, target) {
    if (real == null) return '<span style="color:var(--steel);font-family:\'IBM Plex Mono\',monospace;font-size:9px">—</span>';
    const ok = real <= target * 1.1;
    return `<span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:${ok ? 'var(--ok)' : 'var(--fire)'}">${real}% ${ok ? '✓' : '✗'}</span>`;
  },

  _tabla(ventas, cmvTotal, costos) {
    const filas = [
      { k: 'cmv',        val: cmvTotal },
      { k: 'mano_obra',  val: costos.mano_obra },
      { k: 'arriendo',   val: costos.arriendo },
      { k: 'servicios',  val: costos.servicios },
      { k: 'publicidad', val: costos.publicidad },
      { k: 'otros',      val: costos.otros },
    ];
    const totalCostos = filas.reduce((s, f) => s + Number(f.val || 0), 0);
    const utilidad = ventas ? ventas - totalCostos : null;
    const utilPct = COSTOS._pct(utilidad, ventas);

    return `
      <table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:8px">
        <tr style="color:var(--steel)">
          <th style="text-align:left;padding:4px 0">CATEGORÍA</th>
          <th style="text-align:right;padding:4px 0">TARGET</th>
          <th style="text-align:right;padding:4px 0">REAL</th>
        </tr>
        ${filas.map(f => {
          const pct = COSTOS._pct(Number(f.val || 0), ventas);
          return `<tr style="border-top:1px solid rgba(255,255,255,.04)">
            <td style="padding:6px 0;color:var(--bone)">${COSTOS.LABELS[f.k]}</td>
            <td style="text-align:right;color:var(--steel)">${COSTOS.TARGETS[f.k]}%</td>
            <td style="text-align:right">${COSTOS._badge(pct, COSTOS.TARGETS[f.k])}</td>
          </tr>`;
        }).join('')}
        <tr style="border-top:2px solid rgba(255,255,255,.1)">
          <td style="padding:6px 0;color:var(--bone);font-weight:700">UTILIDAD</td>
          <td style="text-align:right;color:var(--steel)">15%</td>
          <td style="text-align:right">
            <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:${utilPct != null && utilPct >= 15 ? 'var(--ok)' : 'var(--fire)'}">
              ${utilPct != null ? utilPct + '%' : '—'} ${utilidad != null ? '(' + ENGINE.formatCOP(utilidad) + ')' : ''}
            </span>
          </td>
        </tr>
      </table>`;
  },

  _utilidadKpi(ventas, cmvTotal, costos) {
    const totalCostos = cmvTotal + ['mano_obra','arriendo','servicios','publicidad','otros'].reduce((s, k) => s + Number(costos[k] || 0), 0);
    const util = ventas ? ventas - totalCostos : null;
    const pct = COSTOS._pct(util, ventas);
    const cls = pct != null ? (pct >= 15 ? 'ok' : pct >= 8 ? 'gold' : 'fire') : '';
    return `<div class="kpi-value ${cls}">${pct != null ? pct + '%' : '—'}</div><div class="kpi-sub">${util != null ? ENGINE.formatCOP(util) : 'ingresa costos'}</div>`;
  },

  _totalCostosKpi(ventas, cmvTotal, costos) {
    const total = cmvTotal + ['mano_obra','arriendo','servicios','publicidad','otros'].reduce((s, k) => s + Number(costos[k] || 0), 0);
    const pct = COSTOS._pct(total, ventas);
    const cls = pct != null ? (pct <= 85 ? 'ok' : pct <= 90 ? 'gold' : 'fire') : '';
    return `<div class="kpi-value ${cls}">${pct != null ? pct + '%' : '—'}</div><div class="kpi-sub">${ENGINE.formatCOP(total)}</div>`;
  },

  async parsearReporte(input) {
    const file = input.files[0];
    if (!file) return;
    const status = document.getElementById('loggro-status');
    status.textContent = 'Leyendo archivo...';
    status.style.color = 'var(--gold)';
    try {
      const isExcel = /xlsx?$|csv$/i.test(file.name);
      let filas = [];

      if (isExcel && typeof XLSX !== 'undefined') {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        filas = rows.map(r => {
          const vals = Object.values(r);
          const metodo = String(vals[0] || '').trim();
          const total = Number(String(vals[vals.length - 1]).replace(/[^0-9.]/g, '') || 0);
          return { metodo, total };
        }).filter(r => r.metodo && r.total > 0);
      } else {
        // PDF o imagen → Gemini extrae JSON
        status.textContent = 'Analizando con IA...';
        const base64 = await new Promise((res, rej) => {
          const r = new FileReader(); r.onload = e => res(e.target.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file);
        });
        const key = await API._getGeminiKey();
        const prompt = 'Reporte de ventas Loggro. Extrae los métodos de pago y sus totales. Devuelve SOLO un JSON array: [{"metodo":"Efectivo","total":1234567},{"metodo":"Transferencia","total":890000}]. Sin texto adicional.';
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: file.type, data: base64 } }] }] })
        });
        const data = await res.json();
        const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
        const match = text.match(/\[[\s\S]*\]/);
        filas = match ? JSON.parse(match[0]) : [];
      }

      if (!filas.length) throw new Error('No se encontraron datos en el archivo');

      COSTOS._detalle = filas;
      const total = filas.reduce((s, r) => s + r.total, 0);
      document.getElementById('costo-ventas_loggro').value = total;
      document.getElementById('loggro-detalle').innerHTML = COSTOS._detalleHTML(filas);
      status.textContent = `✓ ${filas.length} métodos · Total: ${ENGINE.formatCOPFull(total)} — presiona GUARDAR`;
      status.style.color = 'var(--ok)';
    } catch(e) {
      status.textContent = '✗ ' + e.message;
      status.style.color = 'var(--fire)';
    }
  },

  async guardar(mes) {
    const costos = {};
    ['ventas_loggro','mano_obra','arriendo','servicios','publicidad','otros'].forEach(k => {
      costos[k] = Number(document.getElementById('costo-' + k).value || 0);
    });
    costos.ventas_detalle = COSTOS._detalle.length ? JSON.stringify(COSTOS._detalle) : '';
    try {
      await API.get('guardarCostos', { payload: JSON.stringify({ mes, costos }) });
      APP.toast('Costos guardados ✓');
      COSTOS.render();
    } catch(e) {
      APP.toast('Error: ' + e.message);
    }
  },

  skeleton() {
    return `<div class="topbar"><div class="page-title">P&L</div></div>
      <div class="content"><div class="kpi-grid">${Array(4).fill('<div class="kpi-card"><div class="skeleton" style="height:12px;width:60%;margin-bottom:8px"></div><div class="skeleton" style="height:28px;width:80%"></div></div>').join('')}</div></div>`;
  }
};
