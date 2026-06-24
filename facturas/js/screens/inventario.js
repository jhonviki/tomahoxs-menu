// js/screens/inventario.js
const INV = {
  ITEMS: {
    BEBIDAS: ['Águila','Águila Light','Heineken','Club Colombia','Coca Cola','Coca Cola Zero','Hatsu','Agua','Sprite','Premio','Cuatro','Bretaña','Agua Manzana','Pilsen','Corona','Tres Cordilleras'],
    CARNES:  ['Punta de Anca','Solomo','Tocineta','Churrasco','Chuzo','Bolitas de Carne 130','Salchicha','Brisket Láminas','Brisket Chopped','Pork Belly Láminas','Pork Belly Chopped','Pulled Pork'],
    OTROS:   ['Pan Hamburguesa','Pan Perro','Mozzarella','Cheddar','Queso Cheddar Grueso','Philadelphia','Dip Philadelphia','Welsh','Gouda','Parmesano','Papialpa','Queso Entero'],
    SALSAS:  ['Mermelada Tomate','Mermelada Manzana','Mermelada Fresa','Toffee','Salsa Piña','Guacamole']
  },
  UNIDADES: { BEBIDAS: 'und', CARNES: 'g', OTROS: 'und', SALSAS: 'g' },
  STAFF: ['Sofia','Valentina','Karol','Jhon'],

  _tipo: '',
  _modulo: '',
  _responsable: '',
  _items: [],

  render() {
    INV._tipo = '';
    INV._modulo = '';
    INV._items = [];
    const el = document.getElementById('screen-inventario');
    el.innerHTML = INV._htmlStep1();
    INV._wireStep1();
  },

  _htmlStep1() {
    const s = AUTH.get();
    const user = (s && s.user) ? s.user.toLowerCase() : '';
    return `
      <div class="topbar">
        <div><div class="page-title">INVENTARIO</div></div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel);letter-spacing:1px">${new Date().toLocaleDateString('es-CO',{weekday:'short',day:'numeric',month:'short'}).toUpperCase()}</div>
      </div>
      <div class="content" id="inv-body">

        <div class="card" style="margin-bottom:16px">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel);letter-spacing:1.5px;margin-bottom:12px">¿QUIÉN ERES?</div>
          <select id="inv-responsable" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:10px 12px;color:var(--bone);font-size:13px;margin-bottom:8px">
            <option value="">Selecciona tu nombre...</option>
            ${INV.STAFF.map(n => `<option value="${n}" ${n.toLowerCase()===user?'selected':''}>${n}</option>`).join('')}
            <option value="__otro__">Otro (escribir)</option>
          </select>
          <input id="inv-otro-nombre" type="text" placeholder="Escribe tu nombre..."
            style="display:none;width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:10px 12px;color:var(--bone);font-size:13px;box-sizing:border-box">
        </div>

        <div class="card" style="margin-bottom:16px">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel);letter-spacing:1.5px;margin-bottom:12px">TIPO DE REGISTRO</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <button class="inv-tipo btn btn-secondary" data-v="APERTURA" onclick="INV._selTipo('APERTURA',this)" style="padding:12px 4px;font-size:11px;line-height:1.6">🌅<br>APERTURA</button>
            <button class="inv-tipo btn btn-secondary" data-v="COMPRA"   onclick="INV._selTipo('COMPRA',this)"   style="padding:12px 4px;font-size:11px;line-height:1.6">📦<br>COMPRA</button>
            <button class="inv-tipo btn btn-secondary" data-v="CIERRE"   onclick="INV._selTipo('CIERRE',this)"   style="padding:12px 4px;font-size:11px;line-height:1.6">🌙<br>CIERRE</button>
          </div>
        </div>

        <div class="card" style="margin-bottom:20px">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel);letter-spacing:1.5px;margin-bottom:12px">MÓDULO</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <button class="inv-mod btn btn-secondary" data-v="BEBIDAS" onclick="INV._selMod('BEBIDAS',this)" style="padding:14px 4px;font-size:11px;line-height:1.6">🍺<br>BEBIDAS</button>
            <button class="inv-mod btn btn-secondary" data-v="CARNES"  onclick="INV._selMod('CARNES',this)"  style="padding:14px 4px;font-size:11px;line-height:1.6">🥩<br>CARNES</button>
            <button class="inv-mod btn btn-secondary" data-v="OTROS"   onclick="INV._selMod('OTROS',this)"   style="padding:14px 4px;font-size:11px;line-height:1.6">🍞<br>OTROS</button>
            <button class="inv-mod btn btn-secondary" data-v="SALSAS"  onclick="INV._selMod('SALSAS',this)"  style="padding:14px 4px;font-size:11px;line-height:1.6">🍅<br>SALSAS</button>
          </div>
        </div>

        <button id="inv-btn-next" class="btn btn-primary" style="width:100%;padding:14px;font-size:13px" disabled onclick="INV._goItems()">CONTINUAR →</button>
      </div>`;
  },

  _wireStep1() {
    const sel = document.getElementById('inv-responsable');
    const otro = document.getElementById('inv-otro-nombre');
    sel.addEventListener('change', () => {
      otro.style.display = sel.value === '__otro__' ? 'block' : 'none';
      INV._check();
    });
    otro.addEventListener('input', INV._check);
    INV._check();
  },

  _getResp() {
    const sel = document.getElementById('inv-responsable');
    if (!sel) return INV._responsable;
    return sel.value === '__otro__'
      ? document.getElementById('inv-otro-nombre').value.trim()
      : sel.value;
  },

  _check() {
    const ok = INV._getResp() && INV._tipo && INV._modulo;
    const btn = document.getElementById('inv-btn-next');
    if (btn) btn.disabled = !ok;
  },

  _selTipo(val, el) {
    INV._tipo = val;
    document.querySelectorAll('.inv-tipo').forEach(b => b.classList.remove('btn-primary'));
    el.classList.add('btn-primary');
    INV._check();
  },

  _selMod(val, el) {
    INV._modulo = val;
    document.querySelectorAll('.inv-mod').forEach(b => b.classList.remove('btn-primary'));
    el.classList.add('btn-primary');
    INV._check();
  },

  _tipoColor() {
    return INV._tipo === 'APERTURA' ? 'var(--ok)' : INV._tipo === 'COMPRA' ? '#2196F3' : 'var(--fire)';
  },

  _goItems() {
    INV._responsable = INV._getResp();
    const items = INV.ITEMS[INV._modulo];
    const unidad = INV.UNIDADES[INV._modulo];
    const esCarnes = INV._modulo === 'CARNES';
    const label = esCarnes
      ? (INV._tipo === 'CIERRE' ? 'Peso final (g)' : 'Peso inicial (g)')
      : (INV._tipo === 'COMPRA' ? 'Cant. comprada' : 'Cantidad');

    document.getElementById('inv-body').innerHTML = `
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;background:${INV._tipoColor()}22;color:${INV._tipoColor()};border:1px solid ${INV._tipoColor()}55;border-radius:4px;padding:3px 8px">${INV._tipo}</span>
          <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--steel)">${INV._modulo} · ${INV._responsable}</span>
        </div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--steel);margin-top:6px">${label} — deja vacío si es 0</div>
      </div>

      <div class="card" style="margin-bottom:16px;padding:8px 12px">
        ${items.map(p => {
          const id = 'iv_' + p.replace(/[^a-zA-Z0-9]/g,'_');
          return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.04)">
            <span style="flex:1;font-size:13px;color:var(--bone)">${p}</span>
            <input class="inv-inp" type="number" min="0" step="${unidad==='g'?10:1}" placeholder="0" id="${id}"
              style="width:76px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:7px 6px;color:var(--bone);font-family:'IBM Plex Mono',monospace;font-size:14px;text-align:center">
            <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--steel);width:26px">${unidad}</span>
          </div>`;
        }).join('')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button class="btn btn-secondary" onclick="INV.render()">← VOLVER</button>
        <button class="btn btn-primary" onclick="INV._goReview()">REVISAR →</button>
      </div>`;
  },

  _goReview() {
    const items = INV.ITEMS[INV._modulo];
    const unidad = INV.UNIDADES[INV._modulo];
    const result = [];
    items.forEach(p => {
      const el = document.getElementById('iv_' + p.replace(/[^a-zA-Z0-9]/g,'_'));
      const val = el ? parseFloat(el.value) : 0;
      if (val > 0) result.push({ producto: p, cantidad: val, unidad });
    });
    if (!result.length) { APP.toast('Ingresa al menos una cantidad'); return; }
    INV._items = result;

    document.getElementById('inv-body').innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel);letter-spacing:1.5px;margin-bottom:12px">CONFIRMAR REGISTRO</div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
          <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;background:${INV._tipoColor()}22;color:${INV._tipoColor()};border:1px solid ${INV._tipoColor()}55;border-radius:4px;padding:3px 8px">${INV._tipo}</span>
          <span style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--steel)">${INV._modulo} · ${INV._responsable}</span>
        </div>
        ${result.map(it => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)">
            <span style="font-size:13px;color:var(--bone)">${it.producto}</span>
            <span style="font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:700;color:var(--fire)">${it.cantidad} ${it.unidad}</span>
          </div>`).join('')}
        <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--steel);margin-top:10px">${result.length} producto${result.length!==1?'s':''} con cantidad</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button class="btn btn-secondary" onclick="INV._goItems()">← CORREGIR</button>
        <button id="inv-btn-save" class="btn btn-primary" style="background:var(--ok);border-color:var(--ok);color:#fff" onclick="INV._save()">✓ GUARDAR</button>
      </div>`;
  },

  async _save() {
    const btn = document.getElementById('inv-btn-save');
    btn.disabled = true;
    btn.textContent = '⏳ Guardando...';
    try {
      const url = new URL(CONFIG.PEDIDOS_URL);
      url.searchParams.set('action', 'guardarRegistro');
      url.searchParams.set('payload', JSON.stringify({
        tipo: INV._tipo,
        modulo: INV._modulo,
        responsable: INV._responsable,
        items: INV._items
      }));
      const res = await fetch(url.toString(), { redirect: 'follow', credentials: 'omit' });
      const text = await res.text();
      if (text.trim().startsWith('<')) throw new Error('Apps Script no responde — redeploy pendiente');
      const data = JSON.parse(text);
      if (!data.ok) throw new Error(data.error || 'Error al guardar');

      document.getElementById('inv-body').innerHTML = `
        <div style="text-align:center;padding:48px 20px">
          <div style="font-size:56px;margin-bottom:16px">✅</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--ok);letter-spacing:3px;margin-bottom:8px">GUARDADO</div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--steel);margin-bottom:6px">${INV._tipo} · ${INV._modulo}</div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--steel);margin-bottom:28px">${INV._responsable} · ${INV._items.length} items</div>
          <button class="btn btn-primary" style="width:100%;padding:14px" onclick="INV.render()">+ NUEVO REGISTRO</button>
        </div>`;
    } catch(e) {
      APP.toast('Error: ' + e.message);
      btn.disabled = false;
      btn.textContent = '✓ GUARDAR';
    }
  }
};
