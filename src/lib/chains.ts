import { defineChain } from 'viem'

/**
 * Arc Testnet — Circle's L1 where USDC is the native gas token.
 * Source: https://docs.arc.network + verified against faucet.circle.com
 */
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    // Arc is unique: USDC itself is the gas token, 6 decimals not 18.
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
    public: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
  // CCTP V2 domain ID for Arc — used by the bridge flow in Phase 4
  contracts: {},
})
