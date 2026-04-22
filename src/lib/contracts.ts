import type { Address } from 'viem'

/**
 * Centralized contract references for PropRail on Arc Testnet.
 * All addresses sourced from verified .env values.
 */

export const PAYOUT_ESCROW_ADDRESS = process.env
  .NEXT_PUBLIC_PAYOUT_ESCROW_ADDRESS as Address

export const USDC_ADDRESS = process.env
  .NEXT_PUBLIC_USDC_ARC_ADDRESS as Address

export const CCTP_TOKEN_MESSENGER_ADDRESS = process.env
  .NEXT_PUBLIC_CCTP_TOKEN_MESSENGER_ARC as Address

// Sanity checks (dev only — catches missing env vars early)
if (typeof window !== 'undefined') {
  if (!PAYOUT_ESCROW_ADDRESS) {
    console.error('[PropRail] NEXT_PUBLIC_PAYOUT_ESCROW_ADDRESS is not set')
  }
  if (!USDC_ADDRESS) {
    console.error('[PropRail] NEXT_PUBLIC_USDC_ARC_ADDRESS is not set')
  }
}

// USDC on Arc uses 6 decimals via the ERC-20 interface
export const USDC_DECIMALS = 6

export const PAYOUT_ESCROW_DEPLOY_BLOCK = BigInt(38431606)