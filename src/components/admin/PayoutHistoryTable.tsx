'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePublicClient, useWriteContract } from 'wagmi'
import { decodeEventLog, keccak256, toBytes } from 'viem'
import type { Log } from 'viem'
import { payoutEscrowAbi } from '@/lib/abi/payoutEscrow'
import { PAYOUT_ESCROW_ADDRESS, PAYOUT_ESCROW_DEPLOY_BLOCK } from '@/lib/contracts'
import { formatUSDC, formatExpiry, shortAddress } from '@/lib/formatters'

type Status = 'Pending' | 'Claimed' | 'Cancelled'

type Row = {
  payoutId: bigint
  trader: `0x${string}`
  amount: bigint
  expiresAt: bigint
  status: Status
  createdTxHash?: `0x${string}`
}

type FilterValue = 'all' | 'pending' | 'claimed' | 'cancelled'

const REFRESH_INTERVAL_MS = 15000
const MAX_BLOCK_RANGE = BigInt(5000)

const PAYOUT_CREATED_TOPIC = keccak256(
  toBytes('PayoutCreated(uint256,address,uint256,bytes32,uint64)')
)
const PAYOUT_CLAIMED_TOPIC = keccak256(
  toBytes('PayoutClaimed(uint256,address,uint32,bytes32,uint64)')
)
const PAYOUT_CANCELLED_TOPIC = keccak256(toBytes('PayoutCancelled(uint256)'))

function getStatusClass(status: Status): string {
  if (status === 'Pending') return 'text-amber-400'
  if (status === 'Claimed') return 'text-emerald-400'
  return 'text-neutral-500'
}

async function fetchLogsInChunks(
  publicClient: ReturnType<typeof usePublicClient>,
  topic: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint
): Promise<Log[]> {
  if (!publicClient) return []
  const all: Log[] = []
  let start = fromBlock
  while (start <= toBlock) {
    const end = start + MAX_BLOCK_RANGE - BigInt(1) > toBlock ? toBlock : start + MAX_BLOCK_RANGE - BigInt(1)
    try {
      const logs = await publicClient.getLogs({
        address: PAYOUT_ESCROW_ADDRESS,
        fromBlock: start,
        toBlock: end,
        event: undefined,
      } as Parameters<typeof publicClient.getLogs>[0])
      for (const log of logs) {
        if (log.topics[0] === topic) all.push(log)
      }
    } catch (e) {
      console.error('[PropRail] getLogs chunk failed', start, end, e)
    }
    start = end + BigInt(1)
  }
  return all
}

export function PayoutHistoryTable() {
  const publicClient = usePublicClient()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState<FilterValue>('all')
  const [searchTrader, setSearchTrader] = useState('')
  const [claimBaseUrl, setClaimBaseUrl] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setClaimBaseUrl(window.location.origin + '/claim')
    }
  }, [])

  const loadEvents = useCallback(async () => {
    if (!publicClient) return
    setErr('')
    try {
      const latestBlock = await publicClient.getBlockNumber()

      const [createdLogs, claimedLogs, cancelledLogs] = await Promise.all([
        fetchLogsInChunks(publicClient, PAYOUT_CREATED_TOPIC, PAYOUT_ESCROW_DEPLOY_BLOCK, latestBlock),
        fetchLogsInChunks(publicClient, PAYOUT_CLAIMED_TOPIC, PAYOUT_ESCROW_DEPLOY_BLOCK, latestBlock),
        fetchLogsInChunks(publicClient, PAYOUT_CANCELLED_TOPIC, PAYOUT_ESCROW_DEPLOY_BLOCK, latestBlock),
      ])

      const claimedIds = new Set<string>()
      for (const log of claimedLogs) {
        try {
          const decoded = decodeEventLog({
            abi: payoutEscrowAbi,
            data: log.data,
            topics: log.topics,
          })
          if (decoded.eventName === 'PayoutClaimed') {
            const args = decoded.args as { payoutId?: bigint }
            if (args.payoutId !== undefined) claimedIds.add(args.payoutId.toString())
          }
        } catch (e) {
          // skip
        }
      }

      const cancelledIds = new Set<string>()
      for (const log of cancelledLogs) {
        try {
          const decoded = decodeEventLog({
            abi: payoutEscrowAbi,
            data: log.data,
            topics: log.topics,
          })
          if (decoded.eventName === 'PayoutCancelled') {
            const args = decoded.args as { payoutId?: bigint }
            if (args.payoutId !== undefined) cancelledIds.add(args.payoutId.toString())
          }
        } catch (e) {
          // skip
        }
      }

      const result: Row[] = []
      for (const log of createdLogs) {
        try {
          const decoded = decodeEventLog({
            abi: payoutEscrowAbi,
            data: log.data,
            topics: log.topics,
          })
          if (decoded.eventName !== 'PayoutCreated') continue
          const args = decoded.args as {
            payoutId?: bigint
            trader?: `0x${string}`
            amount?: bigint
            expiresAt?: bigint
          }
          if (!args.payoutId || !args.trader) continue
          if (args.amount === undefined || args.expiresAt === undefined) continue
          const idStr = args.payoutId.toString()
          let status: Status = 'Pending'
          if (claimedIds.has(idStr)) status = 'Claimed'
          else if (cancelledIds.has(idStr)) status = 'Cancelled'
          result.push({
            payoutId: args.payoutId,
            trader: args.trader,
            amount: args.amount,
            expiresAt: args.expiresAt,
            status,
            createdTxHash: log.transactionHash || undefined,
          })
        } catch (e) {
          // skip unparseable log
        }
      }

      result.sort((a, b) => (b.payoutId > a.payoutId ? 1 : -1))
      setRows(result)
    } catch (e) {
      const msg = (e as Error).message.split('\n')[0]
      setErr(msg || 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [publicClient])

  useEffect(() => {
    loadEvents()
    const id = setInterval(loadEvents, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [loadEvents])

  const { writeContractAsync } = useWriteContract()
  const [cancelingId, setCancelingId] = useState<bigint | undefined>()

  async function handleCancel(payoutId: bigint) {
    setCancelingId(payoutId)
    try {
      await writeContractAsync({
        address: PAYOUT_ESCROW_ADDRESS,
        abi: payoutEscrowAbi,
        functionName: 'cancel',
        args: [payoutId],
      })
      await new Promise((r) => setTimeout(r, 4000))
      await loadEvents()
    } catch (e) {
      const msg = (e as Error).message.split('\n')[0]
      setErr(msg || 'Cancel failed')
    } finally {
      setCancelingId(undefined)
    }
  }

  const filtered = rows.filter((r) => {
    if (filter !== 'all' && r.status.toLowerCase() !== filter) return false
    if (searchTrader && !r.trader.toLowerCase().includes(searchTrader.toLowerCase())) return false
    return true
  })

  const showLoading = loading && rows.length === 0
  const showEmpty = !showLoading && filtered.length === 0
  const emptyMsg = rows.length > 0 ? 'No matches.' : 'No payouts yet. Create one above.'

  return (
    <section className="border border-neutral-800 rounded-lg p-6 bg-neutral-900/40">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Payout history</h2>
        <button onClick={loadEvents} className="text-xs text-neutral-500 hover:text-neutral-300">
          Refresh
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterValue)}
          className="bg-neutral-950 border border-neutral-800 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:border-neutral-600"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="claimed">Claimed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          type="text"
          placeholder="Search trader address"
          value={searchTrader}
          onChange={(e) => setSearchTrader(e.target.value)}
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-md px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-neutral-600"
        />
      </div>

      {err ? <p className="text-xs text-red-400 mb-3">{err}</p> : null}

      <div className="border border-neutral-800 rounded-md overflow-hidden">
        <div className="bg-neutral-950 px-3 py-2 text-xs text-neutral-500 font-mono grid grid-cols-7 gap-2">
          <span>ID</span>
          <span className="col-span-2">Trader</span>
          <span>Amount</span>
          <span>Expiry</span>
          <span>Status</span>
          <span>Action</span>
        </div>

        {showLoading ? (
          <div className="px-3 py-6 text-center text-xs text-neutral-500">Loading events...</div>
        ) : null}

        {showEmpty ? (
          <div className="px-3 py-6 text-center text-xs text-neutral-500">{emptyMsg}</div>
        ) : null}

        {!showLoading && !showEmpty ? (
          <div className="max-h-96 overflow-y-auto">
            {filtered.map((r) => (
              <PayoutRow
                key={r.payoutId.toString()}
                row={r}
                claimBaseUrl={claimBaseUrl}
                canceling={cancelingId === r.payoutId}
                onCancel={handleCancel}
              />
            ))}
          </div>
        ) : null}
      </div>

      <p className="text-xs text-neutral-600 mt-3">
        Auto-refreshes every 15s. Reads events directly from contract {shortAddress(PAYOUT_ESCROW_ADDRESS)}.
      </p>
    </section>
  )
}

function PayoutRow(props: {
  row: Row
  claimBaseUrl: string
  canceling: boolean
  onCancel: (id: bigint) => void
}) {
  const row = props.row
  const nowSec = BigInt(Math.floor(Date.now() / 1000))
  const expired = nowSec > row.expiresAt
  const canCancel = row.status === 'Pending' && expired
  const statusClass = getStatusClass(row.status)
  const claimUrl = props.claimBaseUrl + '/' + row.payoutId.toString()

  return (
    <div className="px-3 py-2 text-xs font-mono grid grid-cols-7 gap-2 border-t border-neutral-800 items-center">
      <span className="text-neutral-400">#{row.payoutId.toString()}</span>
      <span className="col-span-2 text-neutral-300 truncate" title={row.trader}>
        {shortAddress(row.trader)}
      </span>
      <span className="text-neutral-300">{formatUSDC(row.amount)}</span>
      <span className="text-neutral-500">{formatExpiry(row.expiresAt)}</span>
      <span className={statusClass}>{row.status}</span>
      <RowAction
        row={row}
        claimUrl={claimUrl}
        canCancel={canCancel}
        canceling={props.canceling}
        onCancel={props.onCancel}
      />
    </div>
  )
}

function RowAction(props: {
  row: Row
  claimUrl: string
  canCancel: boolean
  canceling: boolean
  onCancel: (id: bigint) => void
}) {
  if (props.canCancel) {
    return (
      <button
        onClick={() => props.onCancel(props.row.payoutId)}
        disabled={props.canceling}
        className="px-2 py-1 rounded border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-500 transition disabled:opacity-40"
      >
        {props.canceling ? '...' : 'Cancel'}
      </button>
    )
  }
  if (props.row.status === 'Pending') {
    return <CopyLinkButton url={props.claimUrl} />
  }
  if (props.row.createdTxHash) {
    const txUrl = 'https://testnet.arcscan.app/tx/' + props.row.createdTxHash
    return (
      
        <a
        href={txUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-neutral-500 hover:text-neutral-300"
      >
        Tx
      </a>
    )
  }
  return <span className="text-neutral-600">--</span>
}

function CopyLinkButton(props: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(props.url)
      setCopied(true)
      setTimeout(function () {
        setCopied(false)
      }, 1500)
    } catch (e) {
      // noop
    }
  }

  const label = copied ? 'Copied' : 'Copy link'

  return (
    <button
      onClick={handleCopy}
      className="px-2 py-1 rounded border border-neutral-700 text-neutral-400 hover:text-emerald-400 hover:border-emerald-700 transition"
      title={props.url}
    >
      {label}
    </button>
  )
}