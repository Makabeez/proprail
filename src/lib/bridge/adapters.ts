/**
 * Bridge of wagmi's connected wallet into Circle's Bridge Kit adapter system.
 *
 * The user is already connected via RainbowKit + wagmi. The Bridge Kit expects
 * a viem adapter, which we build using createViemAdapterFromProvider() fed from
 * the wallet's EIP-1193 provider that wagmi exposes.
 *
 * Circle's official "RainbowKit + Bridge Kit" integration pattern. See:
 * https://www.circle.com/blog/integrating-rainbowkit-with-bridge-kit-for-crosschain-usdc-transfers
 */

'use client'

import { useEffect, useState } from 'react'
import { useAccount, useConnectorClient } from 'wagmi'
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'

type AdapterInstance = Awaited<ReturnType<typeof createViemAdapterFromProvider>>

type AdapterState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; adapter: AdapterInstance }
  | { status: 'error'; error: string }

/**
 * Returns a Bridge Kit adapter built from the user's connected wagmi wallet.
 *
 * Handles:
 *  - Returning loading state while the connector client is resolving
 *  - Rebuilding the adapter if the user changes accounts or chains
 *  - Exposing errors for UI surfacing
 */
export function useBridgeAdapter(): AdapterState {
  const { isConnected, address, chainId } = useAccount()
  const { data: client } = useConnectorClient()
  const [state, setState] = useState<AdapterState>({ status: 'idle' })

  useEffect(() => {
    if (!isConnected || !client) {
      setState({ status: 'idle' })
      return
    }

    let cancelled = false
    setState({ status: 'loading' })

    async function buildAdapter() {
      try {
        // wagmi's connector client exposes the EIP-1193 provider on its transport.
        const transport = client?.transport as { value?: { provider?: unknown } } | undefined
        const provider = transport?.value?.provider

        if (!provider) {
          throw new Error('Could not resolve wallet provider from wagmi connector')
        }

        const adapter = await createViemAdapterFromProvider({
          provider: provider as Parameters<typeof createViemAdapterFromProvider>[0]['provider'],
        })

        if (!cancelled) {
          setState({ status: 'ready', adapter })
        }
      } catch (e) {
        if (!cancelled) {
          const msg = (e as Error).message || 'Failed to build bridge adapter'
          setState({ status: 'error', error: msg })
        }
      }
    }

    buildAdapter()

    return () => {
      cancelled = true
    }
    // Rebuild when wallet, account, or chain changes
  }, [isConnected, client, address, chainId])

  return state
}