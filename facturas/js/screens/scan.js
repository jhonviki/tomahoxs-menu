// js/screens/scan.js
const SCAN = {
  state: { step: 1, imageBase64: null, mimeType: null, geminiResult: null, editedItems: [], isManual: false },

  render() {
    const el = document.getElementById('screen-scan');
    el.innerHTML = `
      <div class="topbar">
        <div class="page-title">ESCANEAR FACTURA</div>
      </div>
      <div class="content" style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1">
        <div id="scan-step1" style="text-align:center;max-width:400px;width:100%">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:14px;color:var(--steel);letter-spacing:3px;margin-bottom:32px">PASO 1 — FOTO DE FACTURA</div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <label class="btn btn-primary scan-btn-area" style="font-size:16px;padding:20px;justify-content:center;cursor:pointer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              TOMAR FOTO
              <input id="scan-input-camera" type="file" accept="image/*" capture="environment" style="display:none">
            </label>
            <label class="btn btn-secondary" style="padding:12px;justify-content:center;cursor:pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              SUBIR DESDE GALERÍA
              <input id="scan-input-gallery" type="file" accept="image/*,application/pdf" style="display:none">
            </label>
            <button id="scan-manual-btn" class="btn btn-secondary" style="padding:12px;justify-content:center;border-style:dashed">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              INGRESAR MANUAL
            </button>
          </div>
          <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--steel);margin-top:20px">JPG · PNG · PDF · Fotos de WhatsApp</div>
        </div>

        <div id="scan-step2" style="display:none;width:100%;max-width:700px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
            <div style="flex:1;margin-right:12px">
              <div style="font-family:'Bebas Neue',sans-serif;font-size:14px;color:var(--steel);letter-spacing:3px">PASO 2 — REVISAR Y GUARDAR</div>
              <input id="scan-proveedor-input" class="input-field" placeholder="Proveedor" style="margin-top:6px;font-family:'Bebas Neue',sans-serif;font-size:18px;padding:4px 8px;color:var(--bone);background:rgba(255,255,255,.06);border:none;border-bottom:1px solid rgba(255,255,255,.15);width:100%">
              <input id="scan-fecha" type="date" class="input-field" style="margin-top:4px;font-size:11px;padding:4px 8px;color:var(--steel)">
            </div>
            <span class="tag tag-ia" id="scan-fuente-badge">✦ IA</span>
          </div>
          <div class="card" style="margin-bottom:16px">
            <table>
              <thead><tr><th>PRODUCTO</th><th>CANT.</th><th>UNIDAD</th><th>$/UNIDAD</th><th>TOTAL</th><th id="scan-th-del" style="display:none"></th></tr></thead>
              <tbody id="scan-items-table"></tbody>
            </table>
            <button id="scan-add-item-btn" style="display:none;margin-top:10px;width:100%;padding:8px;background:rgba(255,255,255,.05);border:1px dashed rgba(255,255,255,.2);border-radius:6px;color:var(--steel);font-family:'IBM Plex Mono',monospace;font-size:10px;cursor:pointer;letter-spacing:1px">+ AGREGAR ÍTEM</button>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--steel)">TOTAL FACTURA</div>
              <div class="amount large" id="scan-total">$0</div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-secondary" id="scan-reset-btn">← NUEVA</button>
              <button class="btn btn-primary" id="scan-save-btn">GUARDAR EN SHEETS</button>
            </div>
          </div>
        </div>

        <div id="scan-loading" style="display:none;text-align:center">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--steel);margin-bottom:12px">Analizando con IA...</div>
          <div class="skeleton" style="height:12px;width:200px;margin:0 auto 8px"></div>
          <div class="skeleton" style="height:12px;width:160px;margin:0 auto"></div>
        </div>
      </div>
    `;

    document.getElementById('scan-input-camera').addEventListener('change', function() { SCAN.handleFile(this); });
    document.getElementById('scan-input-gallery').addEventListener('change', function() { SCAN.handleFile(this); });
    document.getElementById('scan-reset-btn').addEventListener('click', () => SCAN.reset());
    document.getElementById('scan-save-btn').addEventListener('click', () => SCAN.guardar());
    document.getElementById('scan-manual-btn').addEventListener('click', () => SCAN.startManual());
    document.getElementById('scan-add-item-btn').addEventListener('click', () => SCAN.addItem());
  },

  startManual() {
    SCAN.state.isManual = true;
    SCAN.state.editedItems = [SCAN._emptyItem()];
    SCAN.state.geminiResult = { proveedor: '', fecha: new Date().toISOString().substring(0, 10) };
    document.getElementById('scan-step1').style.display = 'none';
    SCAN.showStep2(SCAN.state.geminiResult);
    document.getElementById('scan-fuente-badge').textContent = '✍ MANUAL';
    document.getElementById('scan-fuente-badge').style.background = 'rgba(100,100,255,.2)';
    document.getElementById('scan-th-del').style.display = '';
    document.getElementById('scan-add-item-btn').style.display = 'block';
  },

  _emptyItem() {
    return { producto: '', cantidad: '', unidad: 'kg', precio_unidad: '', _id: Date.now() + Math.random() };
  },

  addItem() {
    SCAN.state.editedItems.push(SCAN._emptyItem());
    SCAN.renderItemsTable();
    SCAN.updateTotal();
    // foco en el último input producto
    const inputs = document.querySelectorAll('#scan-items-table tr:last-child input[data-field="producto"]');
    if (inputs.length) inputs[0].focus();
  },

  deleteItem(idx) {
    SCAN.state.editedItems.splice(idx, 1);
    if (SCAN.state.editedItems.length === 0) SCAN.state.editedItems.push(SCAN._emptyItem());
    SCAN.renderItemsTable();
    SCAN.updateTotal();
  },

  async handleFile(input) {
    const file = input.files[0];
    if (!file) return;
    SCAN.state.isManual = false;
    document.getElementById('scan-step1').style.display = 'none';
    document.getElementById('scan-loading').style.display = 'block';
    try {
      const base64 = await SCAN.fileToBase64(file);
      SCAN.state.imageBase64 = base64;
      SCAN.state.mimeType = file.type || 'image/jpeg';
      const result = await API.scanWithGemini(base64, SCAN.state.mimeType);
      SCAN.state.geminiResult = result;
      SCAN.state.editedItems = (result.items || []).map((item, i) => ({ ...item, _id: i }));
      SCAN.showStep2(result);
    } catch(e) {
      document.getElementById('scan-loading').style.display = 'none';
      document.getElementById('scan-step1').style.display = 'block';
      APP.toast('Error al analizar: ' + e.message);
    }
  },

  showStep2(result) {
    document.getElementById('scan-loading').style.display = 'none';
    document.getElementById('scan-step2').style.display = 'block';
    document.getElementById('scan-proveedor-input').value = result.proveedor || '';
    const fechaEl = document.getElementById('scan-fecha');
    if (fechaEl) fechaEl.value = result.fecha || new Date().toISOString().substring(0, 10);
    SCAN.renderItemsTable();
    SCAN.updateTotal();
  },

  renderItemsTable() {
    const isManual = SCAN.state.isManual;
    const tbody = document.getElementById('scan-items-table');
    tbody.innerHTML = SCAN.state.editedItems.map((item, i) => `
      <tr>
        <td><input class="input-field" style="padding:4px 8px" value="${H(item.producto)}" data-idx="${i}" data-field="producto"></td>
        <td><input class="input-field" style="padding:4px 8px;width:70px" type="number" value="${item.cantidad || ''}" data-idx="${i}" data-field="cantidad"></td>
        <td><input class="input-field" style="padding:4px 8px;width:60px" value="${H(item.unidad)}" data-idx="${i}" data-field="unidad"></td>
        <td><input class="input-field" style="padding:4px 8px;width:90px;color:var(--ember)" type="number" value="${item.precio_unidad || ''}" data-idx="${i}" data-field="precio_unidad"></td>
        <td style="color:var(--ember);font-family:'Bebas Neue',sans-serif;font-size:13px">${ENGINE.formatCOPFull((item.cantidad||0)*(item.precio_unidad||0))}</td>
        ${isManual ? `<td><button data-del="${i}" style="background:none;border:none;color:var(--steel);cursor:pointer;font-size:16px;padding:0 4px">×</button></td>` : '<td></td>'}
      </tr>
    `).join('');

    tbody.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('change', () => {
        const val = inp.type === 'number' ? +inp.value : inp.value;
        SCAN.updateItem(+inp.dataset.idx, inp.dataset.field, val);
      });
    });

    tbody.querySelectorAll('button[data-del]').forEach(btn => {
      btn.addEventListener('click', () => SCAN.deleteItem(+btn.dataset.del));
    });
  },

  updateItem(idx, field, val) {
    SCAN.state.editedItems[idx][field] = val;
    if (field === 'cantidad' || field === 'precio_unidad') {
      const item = SCAN.state.editedItems[idx];
      item.total = (item.cantidad || 0) * (item.precio_unidad || 0);
    }
    SCAN.updateTotal();
  },

  updateTotal() {
    const total = SCAN.state.editedItems.reduce((s, i) => s + ((i.cantidad||0) * (i.precio_unidad||0)), 0);
    document.getElementById('scan-total').textContent = ENGINE.formatCOPFull(total);
  },

  async guardar() {
    const btn = document.getElementById('scan-save-btn');
    const proveedorInput = document.getElementById('scan-proveedor-input');
    const proveedor = (proveedorInput?.value || '').trim() || (SCAN.state.isManual ? 'Manual' : SCAN.state.geminiResult?.proveedor || 'Manual');

    if (SCAN.state.isManual && !proveedor) {
      APP.toast('Ingresa el nombre del proveedor');
      proveedorInput?.focus();
      return;
    }

    btn.textContent = 'GUARDANDO...';
    btn.disabled = true;
    const total = SCAN.state.editedItems.reduce((s, i) => s + ((i.cantidad||0)*(i.precio_unidad||0)), 0);
    const fechaEl = document.getElementById('scan-fecha');
    const factura = {
      id: ENGINE.genId(),
      fecha: fechaEl?.value || new Date().toISOString().substring(0, 10),
      proveedor,
      total,
      fuente: SCAN.state.isManual ? 'Manual' : 'IA',
    };
    const items = SCAN.state.editedItems.filter(i => i.producto).map(i => ({
      ...i,
      id: ENGINE.genItemId(),
      total: (i.cantidad||0) * (i.precio_unidad||0)
    }));
    try {
      await API.post({ action: 'guardarFactura', factura, items });
      API.clearCache();
      SCAN._actualizarLibroCostos(items, factura.proveedor, factura.id).catch(() => {});
      APP.toast('✓ Factura enviada — verifica en Sheets');
      SCAN.reset();
      ROUTER.navigate('historial');
    } catch(e) {
      APP.toast('Error guardando: ' + e.message);
      btn.textContent = 'GUARDAR EN SHEETS';
      btn.disabled = false;
    }
  },

  async _actualizarLibroCostos(items, proveedor, facturaId) {
    const payload = items.filter(i => i.producto && i.precio_unidad > 0).map(i => ({
      insumo: i.producto,
      precio: i.precio_unidad,
      facturaId
    }));
    if (!payload.length) return;
    const url = new URL(CONFIG.PEDIDOS_URL);
    url.searchParams.set('action', 'actualizarCostos');
    url.searchParams.set('payload', JSON.stringify(payload));
    url.searchParams.set('proveedor', proveedor || '');
    await fetch(url.toString(), { redirect: 'follow' });
  },

  reset() {
    SCAN.state = { step: 1, imageBase64: null, mimeType: null, geminiResult: null, editedItems: [], isManual: false };
    SCAN.render();
  },

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};
