// ============================================================================
// Vercel Serverless Function — POST /api/academy
// Recoit une soumission du formulaire ABACUS Academy (/academy) et l'insere
// dans Supabase Gaia (oezaby), schema `ref`, table abacus_academy_formulaires.
//
// Utilise l'API REST PostgREST via `fetch` natif (Node 18+ sur Vercel) — aucune
// dependance npm requise, cohérent avec le repo statique zero-build.
//
// Variables d'environnement a configurer sur Vercel (Project > Settings > Env) :
//   SUPABASE_OEZABY_URL          ex: https://oezaby.supabase.co
//   SUPABASE_OEZABY_SERVICE_KEY  cle service_role du projet oezaby (SECRET)
// Ne JAMAIS exposer la cle service_role cote client.
// ============================================================================

const ALLOWED = [
  'etablissement', 'contact_nom', 'email', 'telephone',
  'pays', 'effectif', 'interet', 'interet_autre', 'message',
];

function clean(v, max = 4000) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_OEZABY_URL;
  const SERVICE_KEY = process.env.SUPABASE_OEZABY_SERVICE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ ok: false, error: 'server_not_configured' });
  }

  // Body : Vercel parse le JSON automatiquement, mais on gere aussi une string.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};

  // Whitelist + nettoyage
  const row = {};
  for (const key of ALLOWED) row[key] = clean(body[key]);
  row.source = clean(body.source) || 'form_web';

  // Validations minimales
  if (!row.email || !/.+@.+\..+/.test(row.email)) {
    return res.status(400).json({ ok: false, error: 'email_invalide' });
  }
  if (!row.etablissement) {
    return res.status(400).json({ ok: false, error: 'etablissement_requis' });
  }

  try {
    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/abacus_academy_formulaires`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        // Schema non-public : indispensable pour cibler `ref` via PostgREST.
        'Content-Profile': 'ref',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error('[academy] supabase insert failed', resp.status, detail);
      return res.status(502).json({ ok: false, error: 'insert_failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[academy] unexpected error', err);
    return res.status(500).json({ ok: false, error: 'unexpected' });
  }
};
