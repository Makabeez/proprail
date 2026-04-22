import { Header } from '@/components/Header'

export default function AdminPage() {
  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-medium mb-2">Prop firm dashboard</h1>
        <p className="text-neutral-400 mb-8">
          Fund treasury, create payouts, track status.
        </p>
        <div className="border border-dashed border-neutral-700 rounded-lg p-12 text-center text-neutral-500">
          {/* TODO Phase 3: treasury panel, create payout form, history table */}
          Phase 3 will build this dashboard.
        </div>
      </main>
    </>
  )
}
