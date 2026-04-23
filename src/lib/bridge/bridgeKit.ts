/**
 * Bridge Kit integration layer for PropRail.
 *
 * After a trader calls our contract's claim() function, USDC is burned on Arc
 * via CCTP V2 (our contract calls depositForBurn internally). This module uses
 * Circle's CCTPV2BridgingProvider to:
 *   1. Fetch the attestation from Circle's iris-api
 *   2. Submit the destination mint via Circle's Orbit forwarder
 *
 * The trader signs ONCE (the claim tx on Arc). The Orbit forwarder handles the
 * destination mint automatically, so the trader doesn't need gas on the
 * destination chain.
 */

import { CCTPV2BridgingProvider } from '@circle-fin/provider-cctp-v2'
import {
  ArcTestnet,
  BaseSepolia,
  EthereumSepolia,
  ArbitrumSepolia,
} from '@circle-fin/bridge-kit/chains'

// Singleton - one provider instance reused across components
let providerInstance: CCTPV2BridgingProvider | null = null

export function getCctpProvider(): CCTPV2BridgingProvider {
  if (!providerInstance) {
    providerInstance = new CCTPV2BridgingProvider()
  }
  return providerInstance
}

// Human-readable labels for our destination chain options.
// The string values match the Blockchain enum in @circle-fin/bridge-kit/chains
export const BRIDGE_DESTINATIONS = [
  {
    chain: 'Arc_Testnet' as const,
    chainDef: ArcTestnet,
    label: 'Keep on Arc Testnet',
    explorerTx: (hash: string) => 'https://testnet.arcscan.app/tx/' + hash,
    cctpDomain: 26,
    isArc: true,
  },
  {
    chain: 'Base_Sepolia' as const,
    chainDef: BaseSepolia,
    label: 'Base Sepolia',
    explorerTx: (hash: string) => 'https://sepolia.basescan.org/tx/' + hash,
    cctpDomain: 6,
    isArc: false,
  },
  {
    chain: 'Ethereum_Sepolia' as const,
    chainDef: EthereumSepolia,
    label: 'Ethereum Sepolia',
    explorerTx: (hash: string) => 'https://sepolia.etherscan.io/tx/' + hash,
    cctpDomain: 0,
    isArc: false,
  },
  {
    chain: 'Arbitrum_Sepolia' as const,
    chainDef: ArbitrumSepolia,
    label: 'Arbitrum Sepolia',
    explorerTx: (hash: string) => 'https://sepolia.arbiscan.io/tx/' + hash,
    cctpDomain: 3,
    isArc: false,
  },
] as const

export type BridgeDestination = (typeof BRIDGE_DESTINATIONS)[number]

export function getDestinationByChain(chainName: string): BridgeDestination | undefined {
  return BRIDGE_DESTINATIONS.find((d) => d.chain === chainName)
}

/**
 * Address-to-bytes32 conversion for CCTP mintRecipient parameter.
 * CCTP uses bytes32 for addresses to support non-EVM chains; for EVM
 * we left-pad the 20-byte address with 12 zero bytes.
 */
export function addressToBytes32(address: string): `0x${string}` {
  const clean = address.toLowerCase().replace(/^0x/, '')
  return ('0x' + '0'.repeat(24) + clean) as `0x${string}`
}

/**
 * Arc-native claim flow: our PayoutEscrow.claim() requires destinationDomain,
 * mintRecipient, maxFee, minFinalityThreshold. For "Keep on Arc" flow, we can't
 * actually use our contract's claim (it always burns via CCTP). The trader UI
 * should hide the "keep on Arc" option when using our contract's claim path,
 * OR we redeploy with claimToSelf. For Phase 4, we only support crosschain.
 *
 * For crosschain claims, these are the args passed to claim():
 */
export function buildClaimArgs(
  destinationDomain: number,
  traderAddress: `0x${string}`,
): {
  destinationDomain: number
  mintRecipient: `0x${string}`
  maxFee: bigint
  minFinalityThreshold: number
} {
  return {
    destinationDomain,
    mintRecipient: addressToBytes32(traderAddress),
    // maxFee is the maximum bridging fee the trader will tolerate in USDC base units.
    // For testnet flows with Fast Transfer, 0.01 USDC (10_000 base units) is plenty.
    maxFee: BigInt(10_000),
    // minFinalityThreshold = 1000 for Fast Transfer on CCTP V2
    minFinalityThreshold: 1000,
  }
}