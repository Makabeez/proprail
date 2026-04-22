'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'

export function Header() {
  return (
    <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-mono text-lg tracking-tight text-neutral-100 hover:text-white"
        >
          PropRail<span className="text-emerald-400">.</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/admin"
            className="text-neutral-400 hover:text-neutral-100 transition"
          >
            Admin
          </Link>
          <Link
            href="/claim/demo"
            className="text-neutral-400 hover:text-neutral-100 transition"
          >
            Claim
          </Link>
          <ConnectButton
            showBalance={false}
            accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
          />
        </nav>
      </div>
      <div className="bg-amber-950/40 border-t border-amber-900/40 text-amber-300 text-xs text-center py-1.5">
        ⚠️ Arc Testnet demo — funds are not real
      </div>
    </header>
  )
}
