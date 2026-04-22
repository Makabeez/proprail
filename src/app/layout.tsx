import type { Metadata } from 'next'
import { Providers } from '@/lib/providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'PropRail — USDC payouts for prop-trading firms',
  description:
    'Instant, crosschain USDC payouts built on Arc Testnet and CCTP V2.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-neutral-950 text-neutral-100 antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
