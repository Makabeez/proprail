'use client'

import { useMemo, useState } from 'react'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { payoutEscrowAbi } from '@/lib/abi/payoutEscrow'
import { PAYOUT_ESCROW_ADDRESS } from '@/lib/contracts'
import { formatUSDC, formatExpiry, shortAddress } from '@/lib/formatters'
import {
  BRIDGE_DESTINATIONS,
  buildClaimArgs,
  getCctpProvider,
  getDestinationByChain,
  type BridgeDestination,
} from '@/lib/bridge/bridgeKit'
import { useBridgeAdapter } from '@/lib/bridge/adapters'
import {
  ClaimProgress,
  DEFAULT_STEPS,
  type ClaimStep,
} from './ClaimProgress'
import { ClaimSuccess } from './ClaimSuccess'

export type PayoutData = {
  payoutId: bigint
  trader: `0x${string}`
  amount: bigint
  expiresAt: bigint
  status: number
}

type Props = {
  payoutId: bigint
  payout: PayoutData
}

type FlowState =
  | { phase: 'idle' }
  | { phase: 'running'; steps: ClaimStep[] }
  | { phase: 'success'; destination: BridgeDestination; destTxHash: string }
  | { phase: 'error'; message: string; steps: ClaimStep[] }

const ARC_EXPLORER_TX = (hash: string) =>
  'https://testnet.arcscan.app/tx/' + hash

export function ClaimForm(props: Props) {
  const { address: connectedAddress } = useAccount()
  const [selectedChain, setSelectedChain] = useState<BridgeDestination>(
    BRIDGE_DESTINATIONS[1], // default to Base Sepolia
  )
  const [flow, setFlow] = useState<FlowState>({ phase: 'idle' })

  const adapterState = useBridgeAdapter()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()

  // Connected wallet must match the payout's trader address
  const walletMatches = useMemo(() => {
    if (!connectedAddress) return false
    return connectedAddress.toLowerCase() === props.payout.trader.toLowerCase()
  }, [connectedAddress, props.payout.trader])

  const expired =
    BigInt(Math.floor(Date.now() / 1000)) > props.payout.expiresAt
  const isPending = props.payout.status === 1

  async function handleClaim() {
    if (!connectedAddress) return
    if (adapterState.status !== 'ready') return
    if (selectedChain.isArc) {
      setFlow({
        phase: 'error',
        message: 'Keep-on-Arc not yet supported. Pick a different destination.',
        steps: DEFAULT_STEPS,
      })
      return
    }

    // Initialize step state
    const steps: ClaimStep[] = DEFAULT_STEPS.map((s) => ({ ...s }))
    steps[0].status = 'active'
    setFlow({ phase: 'running', steps: [...steps] })

    // STEP 1: Burn - call PayoutEscrow.claim() on Arc
    let burnTxHash: `0x${string}`
    try {
      const args = buildClaimArgs(selectedChain.cctpDomain, connectedAddress)
      burnTxHash = await writeContractAsync({
        address: PAYOUT_ESCROW_ADDRESS,
        abi: payoutEscrowAbi,
        functionName: 'claim',
        args: [
          props.payoutId,
          args.destinationDomain,
          args.mintRecipient,
          args.maxFee,
          args.minFinalityThreshold,
        ],
      })
      steps[0].status = 'success'
      steps[0].txHash = burnTxHash
      steps[0].explorerUrl = ARC_EXPLORER_TX(burnTxHash)
      steps[1].status = 'active'
      setFlow({ phase: 'running', steps: [...steps] })
    } catch (e) {
      const msg = (e as Error).message.split('\n')[0] || 'Burn rejected'
      steps[0].status = 'error'
      steps[0].errorMsg = msg
      setFlow({ phase: 'error', message: msg, steps: [...steps] })
      return
    }

    // Wait briefly for the tx to land in a block before querying CCTP
    await new Promise((r) => setTimeout(r, 4000))

    // STEP 2 + 3 + 4: Fetch attestation, forward, mint via CCTPV2BridgingProvider
    try {
      const provider = getCctpProvider()

      const sourceContext = {
        adapter: adapterState.adapter,
        address: connectedAddress,
        chain: BRIDGE_DESTINATIONS[0].chainDef,
      }

      const destContext = {
        adapter: adapterState.adapter,
        address: connectedAddress,
        chain: selectedChain.chainDef,
      }

      // Step 2: Attestation
      const attestationResult = await provider.fetchAttestation(
        sourceContext as Parameters<typeof provider.fetchAttestation>[0],
        burnTxHash,
      )
      steps[1].status = 'success'
      steps[2].status = 'active'
      setFlow({ phase: 'running', steps: [...steps] })

      // Step 3 + 4: Mint on destination (forwarder handles this automatically)
      const mintRequest = await provider.mint(
        sourceContext as Parameters<typeof provider.mint>[0],
        destContext as Parameters<typeof provider.mint>[1],
        attestationResult,
      )

      let destTxHash = ''
      if (mintRequest.type !== 'noop') {
        steps[2].status = 'success'
        steps[3].status = 'active'
        setFlow({ phase: 'running', steps: [...steps] })

        destTxHash = await mintRequest.execute()
        steps[3].status = 'success'
        steps[3].txHash = destTxHash
        steps[3].explorerUrl = selectedChain.explorerTx(destTxHash)
      } else {
        // noop means already executed; mark all downstream as done
        steps[2].status = 'success'
        steps[3].status = 'success'
      }

      setFlow({
        phase: 'success',
        destination: selectedChain,
        destTxHash,
      })
    } catch (e) {
      const msg = (e as Error).message.split('\n')[0] || 'Bridge failed'
      const firstActive = steps.findIndex((s) => s.status === 'active')
      if (firstActive >= 0) {
        steps[firstActive].status = 'error'
        steps[firstActive].errorMsg = msg
      }
      setFlow({ phase: 'error', message: msg, steps: [...steps] })
    }
  }

  // === Render branches ===

  if (flow.phase === 'success') {
    return (
      <ClaimSuccess
        amount={formatUSDC(props.payout.amount)}
        destinationChainLabel={flow.destination.label}
        destinationTxHash={flow.destTxHash}
        destinationExplorerUrl={flow.destination.explorerTx(flow.destTxHash)}
      />
    )
  }

  return (
    <section className="border border-neutral-800 rounded-lg p-6 bg-neutral-900/40">
      <PayoutHeader
        amount={props.payout.amount}
        trader={props.payout.trader}
        expiresAt={props.payout.expiresAt}
        expired={expired}
        pending={isPending}
      />

      <GuardrailBanners
        connected={Boolean(connectedAddress)}
        walletMatches={walletMatches}
        expired={expired}
        pending={isPending}
        traderAddress={props.payout.trader}
      />

      <DestinationPicker
        selected={selectedChain}
        onSelect={setSelectedChain}
        disabled={flow.phase === 'running'}
      />

      <ClaimButton
        onClick={handleClaim}
        disabled={
          !connectedAddress ||
          !walletMatches ||
          !isPending ||
          expired ||
          adapterState.status !== 'ready' ||
          flow.phase === 'running'
        }
        running={flow.phase === 'running'}
      />

      <ProgressOrError flow={flow} />
    </section>
  )
}

// ======= sub-components (no raw <a> tags) =======

function PayoutHeader(props: {
  amount: bigint
  trader: `0x${string}`
  expiresAt: bigint
  expired: boolean
  pending: boolean
}) {
  return (
    <div className="mb-6">
      <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
        Payout amount
      </div>
      <div className="text-4xl font-mono text-neutral-100 mb-3">
        {formatUSDC(props.amount)} <span className="text-base text-neutral-500">USDC</span>
      </div>
      <div className="text-xs text-neutral-500 font-mono">
        To: {shortAddress(props.trader)}
      </div>
      <div className="text-xs text-neutral-500 mt-1">
        Expires in: {formatExpiry(props.expiresAt)}
      </div>
    </div>
  )
}

function GuardrailBanners(props: {
  connected: boolean
  walletMatches: boolean
  expired: boolean
  pending: boolean
  traderAddress: `0x${string}`
}) {
  if (!props.pending) {
    return (
      <Banner tone="neutral">
        This payout is no longer pending (already claimed or cancelled).
      </Banner>
    )
  }
  if (props.expired) {
    return <Banner tone="amber">This payout has expired.</Banner>
  }
  if (!props.connected) {
    return (
      <Banner tone="neutral">
        Connect the trader wallet to claim this payout.
      </Banner>
    )
  }
  if (!props.walletMatches) {
    return (
      <Banner tone="amber">
        Connected wallet does not match the payout recipient (
        {shortAddress(props.traderAddress)}).
      </Banner>
    )
  }
  return null
}

function DestinationPicker(props: {
  selected: BridgeDestination
  onSelect: (d: BridgeDestination) => void
  disabled: boolean
}) {
  return (
    <div className="mb-6">
      <div className="text-xs text-neutral-500 mb-2">
        Where do you want your USDC?
      </div>
      <div className="space-y-2">
        {BRIDGE_DESTINATIONS.map((dest) => (
          <DestinationOption
            key={dest.chain}
            destination={dest}
            selected={props.selected.chain === dest.chain}
            disabled={props.disabled}
            onClick={props.onSelect}
          />
        ))}
      </div>
    </div>
  )
}

function DestinationOption(props: {
  destination: BridgeDestination
  selected: boolean
  disabled: boolean
  onClick: (d: BridgeDestination) => void
}) {
  const base =
    'w-full text-left px-4 py-3 rounded-md border transition text-sm font-medium'
  let cls = base + ' border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-600'
  if (props.selected) {
    cls = base + ' border-emerald-600/50 bg-emerald-950/30 text-emerald-200'
  }
  if (props.disabled) {
    cls = cls + ' opacity-50 cursor-not-allowed'
  }

  function handleClick() {
    if (!props.disabled) props.onClick(props.destination)
  }

  const label = props.destination.label
  const hint = props.destination.isArc
    ? '(experimental)'
    : 'via Circle CCTP V2'

  return (
    <button onClick={handleClick} disabled={props.disabled} className={cls}>
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="text-xs text-neutral-500 font-normal">{hint}</span>
      </div>
    </button>
  )
}

function ClaimButton(props: {
  onClick: () => void
  disabled: boolean
  running: boolean
}) {
  const label = props.running ? 'Processing...' : 'Claim payout'
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      className="w-full px-4 py-3 rounded-md bg-emerald-500 text-neutral-950 text-sm font-semibold hover:bg-emerald-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  )
}

function ProgressOrError(props: { flow: FlowState }) {
  if (props.flow.phase === 'running') {
    return (
      <div className="mt-6 border-t border-neutral-800 pt-6">
        <ClaimProgress steps={props.flow.steps} />
      </div>
    )
  }
  if (props.flow.phase === 'error') {
    return (
      <div className="mt-6 border-t border-neutral-800 pt-6 space-y-4">
        <ClaimProgress steps={props.flow.steps} />
        <Banner tone="red">{props.flow.message}</Banner>
      </div>
    )
  }
  return null
}

function Banner(props: {
  tone: 'neutral' | 'amber' | 'red'
  children: React.ReactNode
}) {
  const base = 'rounded-md p-3 text-xs mb-4 border'
  let cls = base + ' border-neutral-800 bg-neutral-950 text-neutral-400'
  if (props.tone === 'amber') {
    cls = base + ' border-amber-900/50 bg-amber-950/20 text-amber-300'
  } else if (props.tone === 'red') {
    cls = base + ' border-red-900/50 bg-red-950/20 text-red-300'
  }
  return <div className={cls}>{props.children}</div>
}