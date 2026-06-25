// js/screens/recetas.js
const RECETAS = {
  state: { recetas: [], items: [], selected: null },

  async render() {
    const el = document.getElementById('screen-recetas');
    el.innerHTML = `
      <div class="topbar"><div class="page-title">RECETAS Y MÁRGENES</div></div>
      <div id="recetas-loading" style="flex:1;display:flex;align-items:center;justify-content:center">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--steel)">Calculando márgenes...</div>
      </div>
      <div id="recetas-content" style="display:none;flex:1;overflow:hidden;flex-direction:row"></div>
    `;
    await RECETAS.load();
  },

  async load() {
    try {
      const [recetas, facturas] = await Promise.all([
        API.get('getRecetas'),
        API.get('getFacturas', {})
      ]);
      RECETAS.state.recetas = Array.isArray(recetas) ? recetas : [];
      RECETAS.state.items = [];
      // Cargar en paralelo en lugar de en serie para evitar N+1 (antes: hasta 30 peticiones seriales)
      const slice = (Array.isArray(facturas) ? facturas : []).slice(0, 30);
      const detalles = await Promise.all(
        slice.map(f => API.get('getFactura', { id: f.id }).catch(() => ({})))
      );
      for (const fd of detalles) {
        if (fd.items) RECETAS.state.items.push(...fd.items);
      }
      RECETAS.buildView();
    } catch(e) {
      console.error('recetas:', e);
      document.getElementById('recetas-loading').innerHTML = `<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--steel)">Error al cargar recetas</div>`;
    }
  },

  buildView() {
    const withMargen = RECETAS.state.recetas.map(r => ({
      ...r, calc: ENGINE.calcReceta(r, RECETAS.state.items)
    })).sort((a, b) => (a.calc.margenPct || 0) - (b.calc.margenPct || 0));

    document.getElementById('recetas-loading').style.display = 'none';
    const content = document.getElementById('recetas-content');
    content.style.display = 'flex';

    content.innerHTML = `
      <div style="width:260px;border-right:1px solid var(--coal);overflow-y:auto;flex-shrink:0">
        ${withMargen.map(r => `
          <div class="receta-item" data-nombre="${H(r.nombre)}" style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:background .1s">
            <div>
              <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--bone)">${H(r.nombre)}</div>
              <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel);margin-top:2px">${ENGINE.formatCOP(r.precio_venta)}</div>
            </div>
            <span class="badge-margin ${r.calc.ok ? ENGINE.margenClass(r.calc.margenPct || 0) : 'warn'}">
              ${r.calc.ok ? (r.calc.margenPct + '%') : '?%'}
            </span>
          </div>
        `).join('')}
      </div>
      <div id="receta-detail" style="flex:1;overflow-y:auto;padding:20px 24px">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--steel);padding-top:60px;text-align:center">
          Selecciona una receta para ver el detalle
        </div>
      </div>
    `;

    content.addEventListener('click', e => {
      const item = e.target.closest('.receta-item');
      if (item) { RECETAS.selectReceta(item.dataset.nombre); return; }
      const btn = e.target.closest('[data-ver-precio]');
      if (btn) APP.toast('Precio sugerido: ' + btn.dataset.verPrecio + ' (redondeado al próximo $500)');
    });
    if (withMargen.length > 0) RECETAS.selectReceta(withMargen[0].nombre);
  },

  selectReceta(nombre) {
    RECETAS.state.selected = nombre;
    document.querySelectorAll('.receta-item').forEach(el => {
      el.classList.toggle('selected', el.dataset.nombre === nombre);
    });
    const receta = RECETAS.state.recetas.find(r => r.nombre === nombre);
    if (!receta) return;
    const calc = ENGINE.calcReceta(receta, RECETAS.state.items);
    const detail = document.getElementById('receta-detail');

    detail.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--bone)">${H(receta.nombre)}</div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--steel);margin-top:4px">
            ${receta.num_porciones > 1 ? receta.num_porciones + ' porciones · ' : ''}
            Error buffer: ${Math.round((receta.margen_error || 0.08) * 100)}% · Target: ${Math.round((receta.pct_materia_prima || 0.35) * 100)}% food cost
          </div>
        </div>
        <span class="badge-margin ${calc.ok ? ENGINE.margenClass(calc.margenPct) : 'warn'}" style="font-size:13px;padding:6px 14px">
          ${calc.ok ? calc.margenPct + '%' : 'SIN DATOS'}
        </span>
      </div>

      ${calc.ok ? `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
        <div class="card" style="text-align:center">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--steel);margin-bottom:4px">PRECIO VENTA</div>
          <div class="amount large">${ENGINE.formatCOP(receta.precio_venta)}</div>
        </div>
        <div class="card" style="text-align:center">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--steel);margin-bottom:4px">COSTO/PORCIÓN</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--gold)">${ENGINE.formatCOP(calc.costoPorPorcion)}</div>
        </div>
        <div class="card" style="text-align:center">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--steel);margin-bottom:4px">CONTRIBUCIÓN</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:${calc.margenPct>=50?'var(--ok)':'var(--warn)'}">${ENGINE.formatCOP(calc.margenContribucion)}</div>
        </div>
      </div>
      ` : '<div class="card" style="padding:20px;font-family:\'IBM Plex Mono\',monospace;font-size:10px;color:var(--steel);text-align:center">Escanea facturas con estos ingredientes para ver márgenes</div>'}

      <div class="card" style="margin-bottom:16px">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel);letter-spacing:1.2px;margin-bottom:12px">INGREDIENTES</div>
        ${(calc.ingredientes || receta.ingredientes || []).map(ing => {
          const hasPrice = ing.precio_unit != null;
          return `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04)">
              <div>
                <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:${hasPrice ? 'var(--bone)' : 'var(--steel)'}">${ing.producto}</div>
                <div style="font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--steel);margin-top:1px">${ing.cantidad} ${ing.unidad || ''}</div>
              </div>
              <div style="text-align:right">
                ${hasPrice ? `<div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel)">${ENGINE.formatCOPFull(ing.precio_unit)}/${ing.unidad||'und'}</div>
                              <div style="font-family:'Bebas Neue',sans-serif;font-size:12px;color:var(--ember)">${ENGINE.formatCOP(ing.costo)}</div>` :
                              `<span style="font-family:'IBM Plex Mono',monospace;font-size:7px;color:var(--steel)">sin precio</span>`}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      ${calc.ok ? `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:var(--ash);border-radius:8px;border:1px solid var(--coal)">
        <div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel)">PRECIO SUGERIDO (food cost 35%)</div>
          <div class="amount large" style="color:var(--gold)">${ENGINE.formatCOPFull(calc.precioPotencialRedondeado)}</div>
        </div>
        <button class="btn btn-secondary" data-ver-precio="${ENGINE.formatCOPFull(calc.precioPotencialRedondeado)}">VER ANÁLISIS</button>
      </div>
      ` : ''}
    `;
  }
};
