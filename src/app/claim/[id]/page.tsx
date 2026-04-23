'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useReadContract } from 'wagmi'
import { Header } from '@/components/Header'
import { ClaimForm, type PayoutData } from '@/components/claim/ClaimForm'
import { payoutEscrowAbi } from '@/lib/abi/payoutEscrow'
import { PAYOUT_ESCROW_ADDRESS } from '@/lib/contracts'

export default function ClaimPage() {
  const params = useParams<{ id: string }>()
  const rawId = params?.id

  // Parse the URL parameter into a bigint payoutId
  let payoutId: bigint | null = null
  let parseError = ''
  try {
    if (!rawId) throw new Error('No payout id in URL')
    payoutId = BigInt(rawId)
  } catch {
    parseError = 'Invalid payout id: ' + (rawId || '(empty)')
  }

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-6 py-12">
        <PageBody payoutId={payoutId} parseError={parseError} />
      </main>
    </>
  )
}

function PageBody(props: { payoutId: bigint | null; parseError: string }) {
  if (props.parseError) {
    return <ErrorCard title="Invalid link" message={props.parseError} />
  }
  if (props.payoutId === null) {
    return <ErrorCard title="Missing payout id" message="Ask the prop firm for a fresh claim link." />
  }
  return <PayoutLoader payoutId={props.payoutId} />
}

function PayoutLoader(props: { payoutId: bigint }) {
  const { data, isError, error, isLoading } = useReadContract({
    address: PAYOUT_ESCROW_ADDRESS,
    abi: payoutEscrowAbi,
    functionName: 'getPayout',
    args: [props.payoutId],
  })

  if (isLoading) {
    return <LoadingCard />
  }

  if (isError) {
    const msg = (error as Error)?.message?.split('\n')[0] || 'Could not read payout'
    return <ErrorCard title="Could not load payout" message={msg} />
  }

  // data is the Payout struct: { trader, amount, referenceId, expiresAt, status }
  // In wagmi reads of tuple-returning functions, results come back as objects keyed by name
  const raw = data as
    | {
        trader: `0x${string}`
        amount: bigint
        referenceId: `0x${string}`
        expiresAt: bigint
        status: number
      }
    | undefined

  if (!raw || raw.trader === '0x0000000000000000000000000000000000000000') {
    return (
      <ErrorCard
        title="Payout not found"
        message="This payout id does not exist on the deployed escrow."
      />
    )
  }

  const payoutData: PayoutData = {
    payoutId: props.payoutId,
    trader: raw.trader,
    amount: raw.amount,
    expiresAt: raw.expiresAt,
    status: Number(raw.status),
  }

  return (
    <>
      <PageIntro payoutId={props.payoutId} />
      <ClaimForm payoutId={props.payoutId} payout={payoutData} />
    </>
  )
}

function PageIntro(props: { payoutId: bigint }) {
  const idStr = '#' + props.payoutId.toString()
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-medium mb-1">Claim payout {idStr}</h1>
      <p className="text-sm text-neutral-400">
        Choose where to receive your USDC. Circle&apos;s CCTP handles the crosschain transfer.
      </p>
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="border border-neutral-800 rounded-lg p-12 text-center bg-neutral-900/40">
      <div className="text-sm text-neutral-400">Loading payout...</div>
    </div>
  )
}

function ErrorCard(props: { title: string; message: string }) {
  return (
    <div className="border border-red-900/50 rounded-lg p-8 bg-red-950/20">
      <h2 className="text-lg font-medium text-red-300 mb-2">{props.title}</h2>
      <p className="text-sm text-neutral-400 mb-4 break-words">{props.message}</p>
      <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-300">
        Back to home
      </Link>
    </div>
  )
}