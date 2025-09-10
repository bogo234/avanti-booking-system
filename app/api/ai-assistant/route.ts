import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client (only if API key is available)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

// System prompt for the AI assistant
const SYSTEM_PROMPT = `Du är en hjälpsam AI-assistent för Avanti, ett svenskt transportföretag. 

Företagsinformation:
- Namn: Avanti
- Tjänster: Biltransport, personlig transport, logistik
- Kontakt: hello@avanti-app.se, +46 72 123 45 67
- Adress: Exempelgatan 1, 111 22 Stockholm
- Öppettider: Vardagar 9:00-17:00

Du ska:
1. Svara på svenska
2. Vara professionell och hjälpsam
3. Ge korrekt information om Avanti
4. Hjälpa med bokningar, support och allmänna frågor
5. Om du inte vet något, hänvisa till kontaktuppgifterna

Svara kortfattat och användbart.`

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Meddelandet är obligatoriskt och måste vara en sträng' },
        { status: 400 }
      )
    }

    // Check if OpenAI API key is configured
    if (!openai || !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API-nyckel är inte konfigurerad. Kontakta administratören.' },
        { status: 500 }
      )
    }
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    })
    
    const response = completion.choices[0]?.message?.content || 'Tyvärr kunde jag inte generera ett svar. Försök igen.'
    
    return NextResponse.json({ response })
    
  } catch (error) {
    console.error('AI Assistant API Error:', error)
    
    // Fallback response if OpenAI fails
    const fallbackResponse = `Just nu har vi tekniska problem med AI-assistenten. Kontakta oss direkt på hello@avanti-app.se eller +46 72 123 45 67 för hjälp.`
    
    return NextResponse.json({ response: fallbackResponse })
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { message: 'AI Assistant API är aktiv. Använd POST för att skicka meddelanden.' },
    { status: 200 }
  )
}
