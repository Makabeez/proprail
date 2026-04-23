'use client'

/**
 * Live progress tracker for the 4-step CCTP claim flow:
 *
 *   1. Burn       → PayoutEscrow.claim() burns USDC on Arc via CCTP
 *   2. Attest     → Poll iris-api.circle.com for the attestation
 *   3. Forward    → Orbit relayer submits receiveMessage on destination
 *   4. Mint       → USDC lands in trader's wallet on destination chain
 *
 * Step 1 is user-signed on Arc.
 * Steps 2-4 are handled automatically by CCTPV2BridgingProvider via the
 * Orbit forwarder (useForwarder: true) - the trader never sees a second popup.
 */

export type StepStatus = 'pending' | 'active' | 'success' | 'error'

export type ClaimStep = {
  id: 'burn' | 'attest' | 'forward' | 'mint'
  label: string
  status: StepStatus
  txHash?: string
  explorerUrl?: string
  errorMsg?: string
}

export const DEFAULT_STEPS: ClaimStep[] = [
  { id: 'burn', label: 'Burn USDC on Arc', status: 'pending' },
  { id: 'attest', label: 'Wait for Circle attestation', status: 'pending' },
  { id: 'forward', label: 'Forward to destination chain', status: 'pending' },
  { id: 'mint', label: 'Mint USDC at destination', status: 'pending' },
]

type Props = {
  steps: ClaimStep[]
}

export function ClaimProgress(props: Props) {
  return (
    <div className="space-y-3">
      {props.steps.map((step) => (
        <StepRow key={step.id} step={step} />
      ))}
    </div>
  )
}

function StepRow(props: { step: ClaimStep }) {
  const step = props.step
  const iconClass = getIconClass(step.status)
  const labelClass = getLabelClass(step.status)

  return (
    <div className="flex items-start gap-3">
      <div className={iconClass}>
        <StepIcon status={step.status} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={labelClass}>{step.label}</div>
        <StepDetail step={step} />
      </div>
    </div>
  )
}

function StepDetail(props: { step: ClaimStep }) {
  const step = props.step

  if (step.status === 'error' && step.errorMsg) {
    return <div className="text-xs text-red-400 mt-0.5 break-words">{step.errorMsg}</div>
  }

  if (step.txHash && step.explorerUrl) {
    const short = step.txHash.slice(0, 10) + '...' + step.txHash.slice(-6)
    return (
      <a
        href={step.explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-neutral-500 hover:text-emerald-400 font-mono mt-0.5 inline-block"
      >
        {short}
      </a>
    )
  }

  return null
}

function StepIcon(props: { status: StepStatus }) {
  if (props.status === 'success') {
    return <span className="text-sm">✓</span>
  }
  if (props.status === 'active') {
    return <span className="inline-block w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
  }
  if (props.status === 'error') {
    return <span className="text-sm">✗</span>
  }
  return <span className="inline-block w-2 h-2 rounded-full bg-neutral-700" />
}

function getIconClass(status: StepStatus): string {
  const base = 'flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 mt-0.5'
  if (status === 'success') return base + ' bg-emerald-950 text-emerald-400'
  if (status === 'active') return base + ' bg-neutral-900'
  if (status === 'error') return base + ' bg-red-950 text-red-400'
  return base + ' bg-neutral-900'
}

function getLabelClass(status: StepStatus): string {
  const base = 'text-sm'
  if (status === 'success') return base + ' text-neutral-200'
  if (status === 'active') return base + ' text-emerald-300'
  if (status === 'error') return base + ' text-red-300'
  return base + ' text-neutral-500'
}
