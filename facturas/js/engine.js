// js/engine.js

const H = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const ENGINE = {
  matchIngrediente(nombreIngrediente, allItems) {
    const q = (nombreIngrediente || '').toLowerCase().trim();
    const q0 = q.split(' ')[0];
    // Buscar desde el más reciente (allItems ordenado por fecha desc)
    return allItems.find(item => {
      const p = (item.producto || '').toLowerCase().trim();
      return p.includes(q0) || q.includes(p.split(' ')[0]);
    }) || null;
  },

  calcReceta(receta, allItems) {
    const { precio_venta, num_porciones = 1, margen_error = 0.08, pct_materia_prima = 0.35, margen_meta = 0.50, ingredientes = [] } = receta;

    let costoTotal = 0;
    const detalleIngredientes = ingredientes.map(ing => {
      const match = ENGINE.matchIngrediente(ing.producto, allItems);
      const precioUnit = match ? Number(match.precio_unidad) : null;
      const merma = ing.merma_pct || 0;
      const cantConMerma = merma > 0 ? ing.cantidad / (1 - merma) : ing.cantidad;
      const costo = precioUnit !== null ? precioUnit * cantConMerma : null;
      if (costo !== null) costoTotal += costo;
      return { ...ing, precio_unit: precioUnit, costo, match_found: precioUnit !== null };
    });

    const tienePrecios = detalleIngredientes.some(i => i.match_found);
    if (!tienePrecios) return { ok: false, motivo: 'Sin precios de facturas', ingredientes: detalleIngredientes };

    const costoConError = costoTotal * (1 + margen_error);       // +8% buffer real Tomahoxs
    const costoPorPorcion = costoConError / num_porciones;
    const precioPotencial = costoPorPorcion / pct_materia_prima;  // food cost 35%
    const margenContribucion = precio_venta - costoPorPorcion;
    const margenReal = precio_venta > 0 ? margenContribucion / precio_venta : 0;
    const alerta = margenReal < margen_meta;

    return {
      ok: true,
      costoTotal,
      costoConError,
      costoPorPorcion,
      precioPotencial,
      precioPotencialRedondeado: Math.ceil(precioPotencial / 500) * 500,
      margenContribucion,
      margenReal,
      margenPct: Math.round(margenReal * 100),
      alerta,
      ingredientes: detalleIngredientes
    };
  },

  formatCOP(n) {
    if (n == null || isNaN(n)) return '—';
    const abs = Math.abs(n);
    if (abs >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    return `$${Math.round(n).toLocaleString('es-CO')}`;
  },

  formatCOPFull(n) {
    if (n == null || isNaN(n)) return '—';
    return '$' + Math.round(n).toLocaleString('es-CO');
  },

  genId() {
    const d = new Date();
    const fecha = d.toISOString().substring(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `fact_${fecha}_${rand}`;
  },

  genItemId() {
    return 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  },

  margenClass(pct) {
    if (pct >= 60) return 'ok';
    if (pct >= 45) return 'warn';
    return 'danger';
  }
};
