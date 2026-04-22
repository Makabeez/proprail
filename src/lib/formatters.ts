import { formatUnits, parseUnits } from 'viem'
import { USDC_DECIMALS } from './contracts'

/**
 * Convert USDC base units (bigint) to a human string.
 * e.g. 1000000n -> "1.00"
 */
export function formatUSDC(amount: bigint | undefined, fractionDigits = 2): string {
  if (amount === undefined) return '--'
  const raw = formatUnits(amount, USDC_DECIMALS)
  const num = Number(raw)
  return num.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

/**
 * Convert a human input string to USDC base units.
 * e.g. "1.5" -> 1500000n
 */
export function parseUSDC(amount: string): bigint {
  return parseUnits(amount, USDC_DECIMALS)
}

/**
 * Shorten a hex address for display. e.g. 0x9747B4...4ed14
 */
export function shortAddress(address: string | undefined): string {
  if (!address) return '--'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Convert a payout reference string into bytes32.
 * Accepts either "0x..." hex or plain text.
 */
export function toReferenceId(ref: string): `0x${string}` {
  if (ref.startsWith('0x') && ref.length === 66) {
    return ref as `0x${string}`
  }
  // Hash plain text to bytes32 — deterministic, short refs pad to 32 bytes
  const encoder = new TextEncoder()
  const bytes = encoder.encode(ref.slice(0, 31))
  const padded = new Uint8Array(32)
  padded.set(bytes)
  return `0x${Array.from(padded)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}` as `0x${string}`
}

/**
 * Format a unix timestamp as a short relative string.
 */
export function formatExpiry(expiresAt: bigint | number): string {
  const ts = typeof expiresAt === 'bigint' ? Number(expiresAt) : expiresAt
  const now = Math.floor(Date.now() / 1000)
  const diff = ts - now
  if (diff < 0) return 'expired'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export const PAYOUT_STATUS_LABELS = ['None', 'Pending', 'Claimed', 'Cancelled'] as const
export type PayoutStatus = (typeof PAYOUT_STATUS_LABELS)[number]

export function getPayoutStatus(statusNumber: number | bigint): PayoutStatus {
  const n = typeof statusNumber === 'bigint' ? Number(statusNumber) : statusNumber
  return PAYOUT_STATUS_LABELS[n] ?? 'None'
}
