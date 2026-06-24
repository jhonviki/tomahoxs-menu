// js/api.js
const CACHE_TTL = 5 * 60 * 1000; // 5 min
const NO_CACHE  = ['guardar', 'borrar', 'crear', 'check', 'setup', 'limpiar', 'getconfig'];

const API = {
  _geminiKey: null,

  async _getGeminiKey() {
    if (API._geminiKey) return API._geminiKey;
    const cfg = await API.get('getConfig');
    if (!cfg.gemini_key) throw new Error('Gemini key no configurada en Apps Script');
    API._geminiKey = cfg.gemini_key;
    return API._geminiKey;
  },

  _cacheKey(action, params) {
    return 'as_' + action + JSON.stringify(params);
  },

  _fromCache(key) {
    try {
      const c = JSON.parse(localStorage.getItem(key));
      if (c && Date.now() - c.t < CACHE_TTL) return c.v;
    } catch {}
    return null;
  },

  _toCache(key, value) {
    try { localStorage.setItem(key, JSON.stringify({ v: value, t: Date.now() })); } catch {}
  },

  clearCache(prefix) {
    Object.keys(localStorage).filter(k => k.startsWith(prefix || 'as_')).forEach(k => localStorage.removeItem(k));
  },

  async _fetch(url) {
    const res = await fetch(url.toString(), { redirect: 'follow', credentials: 'omit' });
    const text = await res.text();
    if (text.trim().startsWith('<')) throw new Error('Apps Script no responde — verifica el deployment');
    return JSON.parse(text);
  },

  async get(action, params = {}) {
    const url = new URL(CONFIG.APPS_SCRIPT_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const cacheable = !NO_CACHE.some(p => action.toLowerCase().startsWith(p));
    if (!cacheable) return API._fetch(url);

    const key = API._cacheKey(action, params);
    const cached = API._fromCache(key);
    const fresh = API._fetch(url).then(v => { API._toCache(key, v); return v; }).catch(() => null);
    if (cached) { fresh.catch(() => {}); return cached; } // stale-while-revalidate
    return fresh;
  },

  async post(body) {
    const url = new URL(CONFIG.APPS_SCRIPT_URL);
    url.searchParams.set('action', body.action);
    url.searchParams.set('payload', JSON.stringify(body));
    return API._fetch(url);
  },

  async scanWithGemini(imageBase64, mimeType = 'image/jpeg') {
    const key = await API._getGeminiKey();
    const prompt = `Eres un asistente que extrae datos de facturas de proveedores de restaurante.
Analiza esta imagen y devuelve SOLO un JSON con este formato exacto:
{
  "proveedor": "nombre del proveedor",
  "fecha": "YYYY-MM-DD",
  "items": [
    {"producto": "nombre", "cantidad": número, "unidad": "kg|und|lt|gr|...", "precio_unidad": número, "total": número}
  ],
  "total": número total de la factura
}
Si no puedes leer algún campo usa null. No incluyas texto fuera del JSON.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } }
            ]
          }]
        })
      }
    );
    const data = await res.json();
    // Mostrar error de API si existe
    if (data.error) throw new Error(`Gemini API error ${data.error.code}: ${data.error.message}`);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) {
      const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || 'respuesta vacía';
      throw new Error(`Gemini no generó texto (${reason})`);
    }
    // Extraer JSON — soporta respuesta directa o envuelta en ```json ... ```
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (!match) throw new Error(`Gemini respondió pero sin JSON: "${text.substring(0, 100)}"`);
    return JSON.parse(match[1] || match[0]);
  }
};
