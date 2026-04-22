import { Header } from '@/components/Header'

export default function Home() {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-mono text-emerald-400 mb-4">PHASE 0 SCAFFOLD</p>
          <h1 className="text-5xl font-medium tracking-tight mb-6">USDC payouts for<br />prop-trading firms.</h1>
          <p className="text-lg text-neutral-400 leading-relaxed mb-8">Instant, crosschain, onchain-verifiable. Built on Arc Testnet with CCTP V2 routing.</p>
          <div className="flex gap-4">
            <a href="/admin" className="inline-flex items-center px-5 py-3 rounded-md bg-emerald-500 text-neutral-950 text-sm font-medium hover:bg-emerald-400 transition">I am a prop firm</a>
            <a href="/claim/demo" className="inline-flex items-center px-5 py-3 rounded-md border border-neutral-700 text-sm font-medium hover:border-neutral-500 transition">Claim a sample payout</a>
          </div>
        </div>
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-neutral-800 rounded-lg p-6 bg-neutral-900/40"><h3 className="font-medium mb-2">Fund treasury</h3><p className="text-sm text-neutral-400 leading-relaxed">Prop firms deposit USDC into an onchain escrow. Full audit trail.</p></div>
          <div className="border border-neutral-800 rounded-lg p-6 bg-neutral-900/40"><h3 className="font-medium mb-2">Batch payouts</h3><p className="text-sm text-neutral-400 leading-relaxed">Upload a CSV of traders, amounts, and references. Approve once.</p></div>
          <div className="border border-neutral-800 rounded-lg p-6 bg-neutral-900/40"><h3 className="font-medium mb-2">Claim anywhere</h3><p className="text-sm text-neutral-400 leading-relaxed">Traders pick their preferred chain. CCTP V2 delivers in ~30s.</p></div>
        </div>
      </main>
    </>
  )
}
