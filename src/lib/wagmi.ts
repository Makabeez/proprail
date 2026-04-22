'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { arcTestnet } from './chains'

/**
 * WalletConnect Project ID — get one free at https://cloud.reown.com
 * (formerly WalletConnect Cloud). Put it in .env.local as
 * NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.
 */
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

if (!projectId) {
  // eslint-disable-next-line no-console
  console.warn(
    '[PropRail] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. ' +
    'WalletConnect-based wallets will not work. Copy .env.example to ' +
    '.env.local and set it.'
  )
}

export const wagmiConfig = getDefaultConfig({
  appName: 'PropRail',
  projectId: projectId ?? 'placeholder',
  chains: [arcTestnet],
  ssr: true,
})
