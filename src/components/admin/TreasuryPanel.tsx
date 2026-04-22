'use client'

import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { payoutEscrowAbi, erc20Abi } from '@/lib/abi/payoutEscrow'
import { PAYOUT_ESCROW_ADDRESS, USDC_ADDRESS } from '@/lib/contracts'
import { formatUSDC, parseUSDC, shortAddress } from '@/lib/formatters'

type TxStep = 'idle' | 'approving' | 'depositing' | 'withdrawing' | 'done' | 'error'

export function TreasuryPanel() {
  const { address } = useAccount()
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<TxStep>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>()

  const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [PAYOUT_ESCROW_ADDRESS],
    query: { refetchInterval: 10000 },
  })

  const { data: committed, refetch: refetchCommitted } = useReadContract({
    address: PAYOUT_ESCROW_ADDRESS,
    abi: payoutEscrowAbi,
    functionName: 'committed',
    query: { refetchInterval: 10000 },
  })

  const { data: unallocated, refetch: refetchUnallocated } = useReadContract({
    address: PAYOUT_ESCROW_ADDRESS,
    abi: payoutEscrowAbi,
    functionName: 'unallocatedBalance',
    query: { refetchInterval: 10000 },
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, PAYOUT_ESCROW_ADDRESS] : undefined,
    query: { enabled: Boolean(address), refetchInterval: 10000 },
  })

  const { writeContractAsync } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: pendingTxHash })

  function refetchAll() {
    refetchUsdcBalance()
    refetchCommitted()
    refetchUnallocated()
    refetchAllowance()
  }

  async function handleDeposit() {
    if (!address || !amount) return
    setErrorMsg('')

    let amountBn: bigint
    try {
      amountBn = parseUSDC(amount)
    } catch {
      setErrorMsg('Invalid amount')
      return
    }

    try {
      if (!allowance || allowance < amountBn) {
        setStep('approving')
        const approveTx = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'approve',
          args: [PAYOUT_ESCROW_ADDRESS, amountBn],
        })
        setPendingTxHash(approveTx)
        await new Promise((r) => setTimeout(r, 4000))
        await refetchAllowance()
      }

      setStep('depositing')
      const depositTx = await writeContractAsync({
        address: PAYOUT_ESCROW_ADDRESS,
        abi: payoutEscrowAbi,
        functionName: 'depositTreasury',
        args: [amountBn],
      })
      setPendingTxHash(depositTx)
      await new Promise((r) => setTimeout(r, 4000))

      setStep('done')
      setAmount('')
      refetchAll()
      setTimeout(() => setStep('idle'), 3000)
    } catch (err) {
      setStep('error')
      setErrorMsg((err as Error).message.split('\n')[0] ?? 'Transaction failed')
    }
  }

  async function handleWithdraw() {
    if (!address || !amount) return
    setErrorMsg('')

    let amountBn: bigint
    try {
      amountBn = parseUSDC(amount)
    } catch {
      setErrorMsg('Invalid amount')
      return
    }

    try {
      setStep('withdrawing')
      const tx = await writeContractAsync({
        address: PAYOUT_ESCROW_ADDRESS,
        abi: payoutEscrowAbi,
        functionName: 'withdrawTreasury',
        args: [amountBn],
      })
      setPendingTxHash(tx)
      await new Promise((r) => setTimeout(r, 4000))

      setStep('done')
      setAmount('')
      refetchAll()
      setTimeout(() => setStep('idle'), 3000)
    } catch (err) {
      setStep('error')
      setErrorMsg((err as Error).message.split('\n')[0] ?? 'Transaction failed')
    }
  }

  const busy = step === 'approving' || step === 'depositing' || step === 'withdrawing' || isConfirming

  let depositLabel = 'Deposit'
  if (step === 'approving') depositLabel = 'Approving...'
  else if (step === 'depositing') depositLabel = 'Depositing...'

  const withdrawLabel = step === 'withdrawing' ? 'Withdrawing...' : 'Withdraw'

  const explorerUrl = pendingTxHash ? `https://testnet.arcscan.app/tx/${pendingTxHash}` : ''

  return (
    <section className="border border-neutral-800 rounded-lg p-6 bg-neutral-900/40">
      <h2 className="text-lg font-medium mb-1">Treasury</h2>
      <p className="text-sm text-neutral-500 mb-6 font-mono">
        Escrow: {shortAddress(PAYOUT_ESCROW_ADDRESS)}
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="USDC balance" value={formatUSDC(usdcBalance)} />
        <Stat label="Committed" value={formatUSDC(committed)} tone="amber" />
        <Stat label="Unallocated" value={formatUSDC(unallocated)} tone="emerald" />
      </div>

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs text-neutral-500 mb-1">Amount (USDC)</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:border-neutral-600 disabled:opacity-50"
          />
        </div>
        <button
          onClick={handleDeposit}
          disabled={busy || !amount}
          className="px-4 py-2 rounded-md bg-emerald-500 text-neutral-950 text-sm font-medium hover:bg-emerald-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {depositLabel}
        </button>
        <button
          onClick={handleWithdraw}
          disabled={busy || !amount}
          className="px-4 py-2 rounded-md border border-neutral-700 text-sm font-medium hover:border-neutral-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {withdrawLabel}
        </button>
      </div>

      {step === 'done' ? (
        <p className="mt-3 text-xs text-emerald-400">Transaction confirmed.</p>
      ) : null}

      {step === 'error' ? (
        <p className="mt-3 text-xs text-red-400 break-words">{errorMsg}</p>
      ) : null}

      {pendingTxHash ? (
        <p className="mt-3 text-xs text-neutral-500 font-mono break-all">
          Tx: <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-300 hover:text-emerald-400">{pendingTxHash}</a>
        </p>
      ) : null}
    </section>
  )
}

function Stat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'emerald' | 'amber' }) {
  let toneClass = 'text-neutral-100'
  if (tone === 'emerald') toneClass = 'text-emerald-400'
  else if (tone === 'amber') toneClass = 'text-amber-400'

  return (
    <div>
      <div className="text-xs text-neutral-500 mb-1">{label}</div>
      <div className={`text-2xl font-mono ${toneClass}`}>{value}</div>
    </div>
  )
}
