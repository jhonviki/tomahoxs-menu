// js/api.js
const API = {
  async get(action, params = {}) {
    const url = new URL(CONFIG.APPS_SCRIPT_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { redirect: 'follow' });
    return res.json();
  },

  async post(body) {
    // Apps Script redirige POST con 302, el browser convierte a GET y pierde el body.
    // Solución: enviar como GET con payload JSON en query param — funciona sin CORS ni redirect issues.
    const url = new URL(CONFIG.APPS_SCRIPT_URL);
    url.searchParams.set('action', body.action);
    url.searchParams.set('payload', JSON.stringify(body));
    const res = await fetch(url.toString(), { redirect: 'follow' });
    return res.json();
  },

  async scanWithGemini(imageBase64, mimeType = 'image/jpeg') {
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
      `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
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
