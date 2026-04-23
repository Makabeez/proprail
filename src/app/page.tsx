import { Header } from '@/components/Header'

const CONTRACT_ADDRESS = '0xF46E0b43AEf82114DA8a8F62D66bb7b63D3b00b7'
const CONTRACT_SHORT = '0xF46E...00b7'
const CONTRACT_URL = 'https://testnet.arcscan.app/address/' + CONTRACT_ADDRESS
const GITHUB_URL = 'https://github.com/Makabeez/proprail'

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Stats />
        <Footer />
      </main>
    </>
  )
}

function Hero() {
  return (
    <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-28">
      <LivePill />

      <h1 className="mt-8 text-5xl md:text-6xl font-medium tracking-tight leading-[1.05] max-w-3xl">
        USDC payouts for<br />
        <span className="text-neutral-500">prop-trading firms.</span>
      </h1>

      <p className="mt-6 text-lg md:text-xl text-neutral-400 leading-relaxed max-w-2xl">
        A one-signature rail from <span className="text-neutral-200">Arc Testnet</span> to Base,
        Ethereum, and Arbitrum. Powered by Circle&apos;s <span className="text-neutral-200">CCTP V2</span>
        {' '}and <span className="text-neutral-200">Bridge Kit</span>.
      </p>

      <div className="mt-10 flex flex-col sm:flex-row gap-3">
        <a
          href="/admin"
          className="inline-flex items-center justify-center px-5 py-3 rounded-md bg-emerald-500 text-neutral-950 text-sm font-semibold hover:bg-emerald-400 transition-colors"
        >
          Try the admin demo →
        </a>
        <a
          href={CONTRACT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-5 py-3 rounded-md border border-neutral-800 text-sm font-medium text-neutral-300 hover:border-neutral-600 hover:text-neutral-100 transition-colors"
        >
          View contract on ArcScan
        </a>
      </div>
    </section>
  )
}

function LivePill() {
  return (
    <a
      href={CONTRACT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-800 bg-neutral-950 text-xs font-mono text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition-colors group"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span>Live on Arc Testnet</span>
      <span className="text-neutral-600 group-hover:text-neutral-400 transition-colors">•</span>
      <span>{CONTRACT_SHORT}</span>
    </a>
  )
}

function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Fund the treasury',
      body: 'Prop firm deposits USDC into an onchain escrow. Live balance, committed vs unallocated, full audit trail via events.',
    },
    {
      num: '02',
      title: 'Create payouts',
      body: 'One-off or bulk CSV. Each payout is a committed (trader, amount, reference, expiry). Owner-gated.',
    },
    {
      num: '03',
      title: 'Trader claims anywhere',
      body: "Opens a link, picks a destination chain, signs once. Circle's Orbit forwarder mints native USDC on the destination — no gas needed there.",
    },
  ]

  return (
    <section className="border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <SectionLabel>How it works</SectionLabel>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-px bg-neutral-900">
          {steps.map((step) => (
            <div key={step.num} className="bg-neutral-950 p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono text-xs text-emerald-400">{step.num}</span>
                <span className="h-px flex-1 bg-neutral-800"></span>
              </div>
              <h3 className="text-lg font-medium text-neutral-100 mb-2">{step.title}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  const features = [
    {
      title: 'Onchain treasury',
      body: 'Live balance, committed vs unallocated USDC, 2-step deposit flow. Read events directly from the contract.',
    },
    {
      title: 'Crosschain claims',
      body: 'Traders pick Base Sepolia, Ethereum Sepolia, or Arbitrum Sepolia. CCTP V2 burns on Arc, mints on destination.',
    },
    {
      title: 'Batch payouts',
      body: 'Paste a CSV of traders, amounts, and references. Preview + validate, submit in a single transaction.',
    },
    {
      title: 'Bridge Kit orchestration',
      body: "Circle's Orbit forwarder fetches the attestation and submits the destination mint. Zero destination gas for the trader.",
    },
  ]

  return (
    <section className="border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <SectionLabel>What&apos;s built</SectionLabel>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="border border-neutral-800 rounded-lg p-6 bg-neutral-900/30 hover:border-neutral-700 transition-colors"
            >
              <h3 className="text-base font-medium text-neutral-100 mb-2">{f.title}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Stats() {
  const stats = [
    { label: 'Chain', value: 'Arc Testnet' },
    { label: 'Chain ID', value: '5042002' },
    { label: 'Block time', value: '~2s' },
    { label: 'CCTP finality', value: '~30s' },
    { label: 'Deploy cost', value: '0.02 USDC' },
    { label: 'Tests passing', value: '16 / 16' },
  ]

  return (
    <section className="border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <SectionLabel>By the numbers</SectionLabel>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-6 gap-px bg-neutral-900 border border-neutral-900 rounded-lg overflow-hidden">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-neutral-950 p-5">
              <div className="text-xs text-neutral-500 font-mono uppercase tracking-wide mb-2">
                {stat.label}
              </div>
              <div className="text-base text-neutral-100 font-mono">{stat.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="text-xs font-mono text-neutral-500">
          Contract:{' '}
          <a
            href={CONTRACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-300 hover:text-emerald-400 transition-colors"
          >
            {CONTRACT_SHORT}
          </a>
        </div>
        <div className="flex items-center gap-5 text-xs text-neutral-500">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-200 transition-colors"
          >
            GitHub
          </a>
          <span className="text-neutral-700">•</span>
          <a
            href="https://docs.arc.network"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-200 transition-colors"
          >
            Arc Testnet
          </a>
          <span className="text-neutral-700">•</span>
          <a
            href="https://developers.circle.com/bridge-kit"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-200 transition-colors"
          >
            Bridge Kit
          </a>
        </div>
      </div>
    </footer>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-8 bg-emerald-500"></span>
      <span className="text-xs font-mono uppercase tracking-[0.2em] text-emerald-400">
        {children}
      </span>
    </div>
  )
}
