import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GEMINI_KEY = process.env.GEMINI_API_KEY!
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`

const PROMPT = `Analyse ce reçu/ticket de caisse et retourne un JSON structuré.

Retourne UNIQUEMENT un objet JSON valide sans markdown ni backticks, avec cette structure exacte:
{
  "store": "Nom du magasin",
  "date": "YYYY-MM-DD",
  "currency": "CAD",
  "total": 0.00,
  "items": [
    {
      "name": "Nom de l'article",
      "brand": "Marque si visible, sinon chaîne vide",
      "unit": "unité ou kg ou L ou g ou ml",
      "quantity": 1,
      "unit_price": 0.00
    }
  ]
}

Règles:
- "date": date du reçu au format YYYY-MM-DD, sinon date du jour
- "currency": devise (CAD si non précisée)
- "total": montant total payé (cherche TOTAL, TOTAL DÛ, MONTANT DÛ, etc.)
- "items": chaque article avec son prix unitaire
- Si quantité > 1, divise le prix total de la ligne par la quantité pour unit_price
- "unit": kg pour poids, L pour liquide, unité par défaut
- Ignore taxes, sous-totaux, remises globales, points/milles
- Ne retourne aucun texte hors du JSON`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'Image manquante' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mimeType = file.type || 'image/jpeg'

  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: base64 } },
        { text: PROMPT },
      ],
    }],
    generationConfig: { temperature: 0.1 },
  }

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('Gemini error:', res.status, JSON.stringify(err))
    return NextResponse.json({ error: `Gemini ${res.status}: ${JSON.stringify(err)}` }, { status: 502 })
  }

  const data = await res.json()
  const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')

  try {
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json({ error: 'Impossible de parser la réponse IA', raw }, { status: 422 })
  }
}
