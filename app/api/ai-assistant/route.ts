import { NextRequest, NextResponse } from 'next/server'

// Simple AI responses - you can replace this with actual AI API calls
const getAIResponse = (message: string): string => {
  const lowerMessage = message.toLowerCase()
  
  // Swedish responses for common questions
  if (lowerMessage.includes('hej') || lowerMessage.includes('hallo')) {
    return 'Hej! Trevligt att träffa dig. Vad kan jag hjälpa dig med idag?'
  }
  
  if (lowerMessage.includes('vad är') || lowerMessage.includes('vad betyder')) {
    return 'Jag kan hjälpa dig förklara olika begrepp. Vad vill du veta mer om?'
  }
  
  if (lowerMessage.includes('avanti') || lowerMessage.includes('företag')) {
    return 'Avanti är ett innovativt företag som fokuserar på tekniska lösningar. Vi finns på Exempelgatan 1, 111 22 Stockholm. Du kan nå oss på +46 72 123 45 67 eller hello@avanti-app.se.'
  }
  
  if (lowerMessage.includes('hjälp') || lowerMessage.includes('support')) {
    return 'Jag är här för att hjälpa! Du kan fråga mig om:\n• Avanti och våra tjänster\n• Teknisk support\n• Kontaktinformation\n• Allmänna frågor\n\nVad behöver du hjälp med?'
  }
  
  if (lowerMessage.includes('tid') || lowerMessage.includes('öppettider')) {
    return 'Våra öppettider är vardagar 9:00-17:00. För akuta ärenden kan du alltid kontakta oss via email på hello@avanti-app.se.'
  }
  
  if (lowerMessage.includes('kontakt') || lowerMessage.includes('telefon') || lowerMessage.includes('email')) {
    return 'Du kan kontakta oss på följande sätt:\n📞 Telefon: +46 72 123 45 67\n📧 Email: hello@avanti-app.se\n📍 Adress: Exempelgatan 1, 111 22 Stockholm\n🏢 Org.nr: 5590-0000'
  }
  
  if (lowerMessage.includes('tack') || lowerMessage.includes('thanks')) {
    return 'Så kul att jag kunde hjälpa! Finns det något annat du undrar över?'
  }
  
  // Default response
  return `Tack för ditt meddelande: "${message}". Jag förstår att du vill veta mer om detta. Just nu kan jag hjälpa dig med information om Avanti, kontaktuppgifter och allmän support. För mer specifika frågor, kontakta oss gärna direkt på hello@avanti-app.se.`
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Meddelandet är obligatoriskt och måste vara en sträng' },
        { status: 400 }
      )
    }
    
    // Here you would typically call an AI service like OpenAI or Anthropic
    // For now, we'll use the simple response function
    const response = getAIResponse(message)
    
    // Simulate AI thinking time
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return NextResponse.json({ response })
    
  } catch (error) {
    console.error('AI Assistant API Error:', error)
    return NextResponse.json(
      { error: 'Ett fel uppstod när meddelandet bearbetades' },
      { status: 500 }
    )
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { message: 'AI Assistant API är aktiv. Använd POST för att skicka meddelanden.' },
    { status: 200 }
  )
}
