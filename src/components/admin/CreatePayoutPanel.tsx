'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { isAddress } from 'viem'
import { useWriteContract } from 'wagmi'
import { payoutEscrowAbi } from '@/lib/abi/payoutEscrow'
import { PAYOUT_ESCROW_ADDRESS } from '@/lib/contracts'
import { formatUSDC, parseUSDC, shortAddress, toReferenceId } from '@/lib/formatters'

type Tab = 'single' | 'batch'
type TxStep = 'idle' | 'submitting' | 'done' | 'error'

type BatchRow = {
  trader: string
  amount: string
  reference: string
  valid: boolean
  error?: string
}

type CreatedLink = {
  trader: string
  amount: bigint
  reference: string
}

const DEFAULT_EXPIRY_DAYS = 7

export function CreatePayoutPanel() {
  const [tab, setTab] = useState<Tab>('single')

  return (
    <section className="border border-neutral-800 rounded-lg p-6 bg-neutral-900/40">
      <h2 className="text-lg font-medium mb-4">Create payout</h2>

      <div className="flex gap-1 mb-6 border-b border-neutral-800">
        <TabButton active={tab === 'single'} onClick={() => setTab('single')}>
          Single
        </TabButton>
        <TabButton active={tab === 'batch'} onClick={() => setTab('batch')}>
          Batch (CSV)
        </TabButton>
      </div>

      {tab === 'single' ? <SingleForm /> : <BatchForm />}
    </section>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  const cls = active
    ? 'border-b-2 border-emerald-500 text-neutral-100'
    : 'border-b-2 border-transparent text-neutral-500 hover:text-neutral-300'
  return (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium transition ${cls}`}>
      {children}
    </button>
  )
}

function genReference(): string {
  return `ref-${Math.floor(Date.now() / 1000)}-${Math.random().toString(36).slice(2, 8)}`
}

function SingleForm() {
  const [trader, setTrader] = useState('')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [expiryDays, setExpiryDays] = useState(String(DEFAULT_EXPIRY_DAYS))
  const [step, setStep] = useState<TxStep>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>()
  const [lastCreated, setLastCreated] = useState<CreatedLink | undefined>()

  const { writeContractAsync } = useWriteContract()

  async function handleSubmit() {
    setErrorMsg('')

    if (!isAddress(trader)) {
      setErrorMsg('Invalid trader address')
      return
    }

    let amountBn: bigint
    try {
      amountBn = parseUSDC(amount)
      if (amountBn <= BigInt(0)) throw new Error('zero')
    } catch {
      setErrorMsg('Invalid amount')
      return
    }

    const days = Number(expiryDays)
    if (!Number.isFinite(days) || days <= 0) {
      setErrorMsg('Invalid expiry')
      return
    }

    const ref = reference.trim() || genReference()
    const refHex = toReferenceId(ref)
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + days * 86400)

    try {
      setStep('submitting')
      const tx = await writeContractAsync({
        address: PAYOUT_ESCROW_ADDRESS,
        abi: payoutEscrowAbi,
        functionName: 'createPayout',
        args: [trader as `0x${string}`, amountBn, refHex, expiresAt],
      })
      setPendingTxHash(tx)
      await new Promise((r) => setTimeout(r, 4000))

      setLastCreated({ trader, amount: amountBn, reference: ref })
      setStep('done')
      setTrader('')
      setAmount('')
      setReference('')
      setTimeout(() => setStep('idle'), 5000)
    } catch (err) {
      setStep('error')
      setErrorMsg((err as Error).message.split('\n')[0] ?? 'Transaction failed')
    }
  }

  const busy = step === 'submitting'

  return (
    <div className="space-y-4">
      <Field label="Trader address">
        <input
          type="text"
          placeholder="0x..."
          value={trader}
          onChange={(e) => setTrader(e.target.value.trim())}
          disabled={busy}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:border-neutral-600 disabled:opacity-50"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Amount (USDC)">
          <input
            type="text"
            inputMode="decimal"
            placeholder="100.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:border-neutral-600 disabled:opacity-50"
          />
        </Field>

        <Field label="Expiry (days)">
          <input
            type="number"
            min={1}
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
            disabled={busy}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:border-neutral-600 disabled:opacity-50"
          />
        </Field>
      </div>

      <Field label="Reference (optional)">
        <input
          type="text"
          placeholder="auto-generated if blank"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          disabled={busy}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:border-neutral-600 disabled:opacity-50"
        />
      </Field>

      <button
        onClick={handleSubmit}
        disabled={busy || !trader || !amount}
        className="w-full px-4 py-2 rounded-md bg-emerald-500 text-neutral-950 text-sm font-medium hover:bg-emerald-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy ? 'Submitting...' : 'Create payout'}
      </button>

      {step === 'error' ? <p className="text-xs text-red-400 break-words">{errorMsg}</p> : null}

      {step === 'done' && lastCreated ? (
        <div className="border border-emerald-900/40 rounded-md p-4 bg-emerald-950/20">
          <p className="text-sm text-emerald-300 mb-2">Payout created</p>
          <p className="text-xs text-neutral-400 font-mono break-all">
            Trader: {shortAddress(lastCreated.trader)}
          </p>
          <p className="text-xs text-neutral-400 font-mono">
            Amount: {formatUSDC(lastCreated.amount)} USDC
          </p>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            Reference: {lastCreated.reference}
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Claim link will appear in the history table below once the transaction is indexed.
          </p>
        </div>
      ) : null}

      {pendingTxHash ? (
        <p className="text-xs text-neutral-500 font-mono break-all">
          Tx: <a href={`https://testnet.arcscan.app/tx/${pendingTxHash}`} target="_blank" rel="noopener noreferrer" className="text-neutral-300 hover:text-emerald-400">{pendingTxHash}</a>
        </p>
      ) : null}
    </div>
  )
}

function BatchForm() {
  const [rawCsv, setRawCsv] = useState('')
  const [rows, setRows] = useState<BatchRow[]>([])
  const [step, setStep] = useState<TxStep>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>()
  const [expiryDays, setExpiryDays] = useState(String(DEFAULT_EXPIRY_DAYS))

  const { writeContractAsync } = useWriteContract()

  function parseCsv() {
    setErrorMsg('')
    const parsed = Papa.parse<string[]>(rawCsv.trim(), { skipEmptyLines: true })
    const parsedRows: BatchRow[] = parsed.data.map((cols, idx) => {
      const trader = (cols[0] ?? '').trim()
      const amount = (cols[1] ?? '').trim()
      const reference = (cols[2] ?? '').trim() || genReference()

      let error: string | undefined
      if (!isAddress(trader)) error = 'bad address'
      else {
        try {
          const bn = parseUSDC(amount)
          if (bn <= BigInt(0)) error = 'zero amount'
        } catch {
          error = 'bad amount'
        }
      }

      return { trader, amount, reference, valid: !error, error: error ?? `row ${idx + 1}` }
    })
    setRows(parsedRows)
  }

  const validRows = rows.filter((r) => r.valid)
  const totalAmount = validRows.reduce((acc, r) => {
    try {
      return acc + parseUSDC(r.amount)
    } catch {
      return acc
    }
  }, BigInt(0))

  async function handleSubmit() {
    setErrorMsg('')
    if (validRows.length === 0) {
      setErrorMsg('No valid rows')
      return
    }
    const days = Number(expiryDays)
    if (!Number.isFinite(days) || days <= 0) {
      setErrorMsg('Invalid expiry')
      return
    }
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + days * 86400)

    const requests = validRows.map((r) => ({
      trader: r.trader as `0x${string}`,
      amount: parseUSDC(r.amount),
      referenceId: toReferenceId(r.reference),
      expiresAt,
    }))

    try {
      setStep('submitting')
      const tx = await writeContractAsync({
        address: PAYOUT_ESCROW_ADDRESS,
        abi: payoutEscrowAbi,
        functionName: 'createPayoutBatch',
        args: [requests],
      })
      setPendingTxHash(tx)
      await new Promise((r) => setTimeout(r, 4000))

      setStep('done')
      setRows([])
      setRawCsv('')
      setTimeout(() => setStep('idle'), 5000)
    } catch (err) {
      setStep('error')
      setErrorMsg((err as Error).message.split('\n')[0] ?? 'Transaction failed')
    }
  }

  const busy = step === 'submitting'

  return (
    <div className="space-y-4">
      <Field label="CSV (trader, amount, reference)">
        <textarea
          rows={6}
          placeholder={'0xabc...,100.00,ref-1\n0xdef...,250.00,ref-2'}
          value={rawCsv}
          onChange={(e) => setRawCsv(e.target.value)}
          disabled={busy}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 font-mono text-xs focus:outline-none focus:border-neutral-600 disabled:opacity-50"
        />
      </Field>

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <button
            onClick={parseCsv}
            disabled={busy || !rawCsv.trim()}
            className="w-full px-4 py-2 rounded-md border border-neutral-700 text-sm font-medium hover:border-neutral-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Parse and preview
          </button>
        </div>
        <div className="w-32">
          <label className="block text-xs text-neutral-500 mb-1">Expiry (days)</label>
          <input
            type="number"
            min={1}
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
            disabled={busy}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:border-neutral-600 disabled:opacity-50"
          />
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="border border-neutral-800 rounded-md overflow-hidden">
          <div className="bg-neutral-950 px-3 py-2 text-xs text-neutral-500 font-mono grid grid-cols-[1fr_80px_1fr_60px] gap-2">
            <span>Trader</span>
            <span>Amount</span>
            <span>Reference</span>
            <span>OK</span>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {rows.map((r, i) => (
              <div key={i} className="px-3 py-2 text-xs font-mono grid grid-cols-[1fr_80px_1fr_60px] gap-2 border-t border-neutral-800">
                <span className="truncate text-neutral-300">{r.trader || '--'}</span>
                <span className="text-neutral-300">{r.amount || '--'}</span>
                <span className="truncate text-neutral-500">{r.reference}</span>
                <span className={r.valid ? 'text-emerald-400' : 'text-red-400'}>{r.valid ? 'yes' : 'no'}</span>
              </div>
            ))}
          </div>
          <div className="bg-neutral-950 px-3 py-2 text-xs text-neutral-400 font-mono border-t border-neutral-800">
            {validRows.length} valid / {rows.length} total. Total: {formatUSDC(totalAmount)} USDC
          </div>
        </div>
      ) : null}

      <button
        onClick={handleSubmit}
        disabled={busy || validRows.length === 0}
        className="w-full px-4 py-2 rounded-md bg-emerald-500 text-neutral-950 text-sm font-medium hover:bg-emerald-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy ? 'Submitting...' : `Submit batch (${validRows.length} payouts)`}
      </button>

      {step === 'error' ? <p className="text-xs text-red-400 break-words">{errorMsg}</p> : null}
      {step === 'done' ? <p className="text-xs text-emerald-400">Batch submitted. Check the history table below.</p> : null}
      {pendingTxHash ? (
        <p className="text-xs text-neutral-500 font-mono break-all">
          Tx: <a href={`https://testnet.arcscan.app/tx/${pendingTxHash}`} target="_blank" rel="noopener noreferrer" className="text-neutral-300 hover:text-emerald-400">{pendingTxHash}</a>
        </p>
      ) : null}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-neutral-500 mb-1">{label}</label>
      {children}
    </div>
  )
}
