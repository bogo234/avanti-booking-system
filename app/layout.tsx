import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from './contexts/AuthContext'

export const metadata: Metadata = {
  title: 'Avanti - Smidig och pålitlig transport',
  description: 'Boka din resa med Avanti. Välutbildade förare, hög säkerhet och skattade bilar. Snabb och pålitlig transport när du behöver det.',
  keywords: 'transport, taxi, resa, avanti, stockholm, sverige',
  authors: [{ name: 'Avanti' }],
  creator: 'Avanti',
  publisher: 'Avanti',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://avanti-app.se'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Avanti - Smidig och pålitlig transport',
    description: 'Boka din resa med Avanti. Välutbildade förare, hög säkerhet och skattade bilar.',
    url: 'https://avanti-app.se',
    siteName: 'Avanti',
    images: [
      {
        url: '/avanti-logo.png',
        width: 1200,
        height: 630,
        alt: 'Avanti Transport',
      },
    ],
    locale: 'sv_SE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Avanti - Smidig och pålitlig transport',
    description: 'Boka din resa med Avanti. Välutbildade förare, hög säkerhet och skattade bilar.',
    images: ['/avanti-logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/avanti-logo.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for performance */}
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
