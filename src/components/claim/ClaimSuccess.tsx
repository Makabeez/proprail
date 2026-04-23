'use client'

/**
 * Terminal success state for the claim flow.
 * Rendered after the CCTPV2BridgingProvider returns a successful mint.
 */

import Link from 'next/link'

type Props = {
  amount: string
  destinationChainLabel: string
  destinationTxHash: string
  destinationExplorerUrl: string
}

export function ClaimSuccess(props: Props) {
  return (
    <div className="border border-emerald-900/50 rounded-lg p-8 bg-emerald-950/20 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 text-2xl mb-4">
        ✓
      </div>

      <h2 className="text-xl font-medium mb-2 text-emerald-300">
        Payout received
      </h2>

      <p className="text-sm text-neutral-400 mb-1">
        {props.amount} USDC minted on {props.destinationChainLabel}
      </p>

      <p className="text-xs text-neutral-500 mb-6">
        Your funds are ready to use.
      </p>

      <DestinationTxLink
        url={props.destinationExplorerUrl}
        hash={props.destinationTxHash}
      />

      <div className="mt-6">
        <Link
          href="/"
          className="text-xs text-neutral-500 hover:text-neutral-300 transition"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}

function DestinationTxLink(props: { url: string; hash: string }) {
  const shortHash = props.hash.slice(0, 10) + '...' + props.hash.slice(-8)
  return (
    <a
      href={props.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block text-xs font-mono text-neutral-400 hover:text-emerald-400 transition break-all"
    >
      View destination tx: {shortHash}
    </a>
  )
}