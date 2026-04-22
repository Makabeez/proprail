'use client'

import { useAccount, useReadContract } from 'wagmi'
import { Header } from '@/components/Header'
import { TreasuryPanel } from '@/components/admin/TreasuryPanel'
import { CreatePayoutPanel } from '@/components/admin/CreatePayoutPanel'
import { PayoutHistoryTable } from '@/components/admin/PayoutHistoryTable'
import { payoutEscrowAbi } from '@/lib/abi/payoutEscrow'
import { PAYOUT_ESCROW_ADDRESS } from '@/lib/contracts'

export default function AdminPage() {
  const { address, isConnected } = useAccount()

  const { data: ownerAddress } = useReadContract({
    address: PAYOUT_ESCROW_ADDRESS,
    abi: payoutEscrowAbi,
    functionName: 'owner',
  })

  const isOwner =
    isConnected &&
    address &&
    ownerAddress &&
    address.toLowerCase() === ownerAddress.toLowerCase()

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-medium mb-2">Prop firm dashboard</h1>
          <p className="text-neutral-400">
            Fund the treasury, create payouts, and track their status onchain.
          </p>
        </div>

        {!isConnected ? (
          <ConnectPrompt />
        ) : !isOwner ? (
          <NotOwnerWarning
            connectedAddress={address || ''}
            ownerAddress={(ownerAddress as string) || ''}
          />
        ) : (
          <div className="space-y-6">
            <TreasuryPanel />
            <CreatePayoutPanel />
            <PayoutHistoryTable />
          </div>
        )}
      </main>
    </>
  )
}

function ConnectPrompt() {
  return (
    <div className="border border-dashed border-neutral-700 rounded-lg p-12 text-center">
      <p className="text-neutral-400 mb-2">Connect your wallet to access the dashboard.</p>
      <p className="text-xs text-neutral-600">Only the contract owner can deposit and create payouts.</p>
    </div>
  )
}

function NotOwnerWarning(props: { connectedAddress: string; ownerAddress: string }) {
  const shortConnected =
    props.connectedAddress.slice(0, 6) + '...' + props.connectedAddress.slice(-4)
  const shortOwner =
    props.ownerAddress.slice(0, 6) + '...' + props.ownerAddress.slice(-4)

  return (
    <div className="border border-amber-900/40 rounded-lg p-8 bg-amber-950/20">
      <p className="text-amber-300 mb-3">Not authorized</p>
      <p className="text-sm text-neutral-400 mb-2">
        You are connected as {shortConnected}, but the contract owner is {shortOwner}.
      </p>
      <p className="text-xs text-neutral-500 font-mono break-all">
        Switch to the owner wallet in Rabby to access treasury and payout controls.
      </p>
    </div>
  )
}
