import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'Image manquante' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mimeType = (file.type || 'image/jpeg')

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `Analyse ce reçu/ticket de caisse et retourne un JSON structuré.

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

  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64 } },
    prompt,
  ])

  const raw = result.response.text().trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')

  try {
    const parsed = JSON.parse(raw)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Impossible de parser la réponse IA', raw }, { status: 422 })
  }
}
