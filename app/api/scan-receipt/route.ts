import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  authToken: process.env.ANTHROPIC_AUTH_TOKEN,
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'Image manquante' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp'

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `Analyse ce reçu/ticket de caisse et retourne un JSON structuré.

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
- "total": montant total payé (cherche "TOTAL", "TOTAL DÛ", "MONTANT DÛ", etc.)
- "items": chaque article acheté avec son prix unitaire
- Si la quantité est > 1, divise le prix total de la ligne par la quantité pour avoir unit_price
- Pour "unit": utilise "kg" pour poids, "L" pour liquide, "unité" par défaut
- Ignore taxes, sous-totaux, remises globales, points/milles
- Ne retourne aucun texte hors du JSON`,
          },
        ],
      },
    ],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()

  try {
    const parsed = JSON.parse(raw)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Impossible de parser la réponse IA', raw }, { status: 422 })
  }
}
