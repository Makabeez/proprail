import { Header } from '@/components/Header'

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-medium mb-2">Claim payout</h1>
        <p className="text-neutral-400 mb-8">
          Payout ID: <span className="font-mono">{id}</span>
        </p>
        <div className="border border-dashed border-neutral-700 rounded-lg p-12 text-center text-neutral-500">
          {/* TODO Phase 4: load payout from PayoutEscrow, CCTP claim flow */}
          Phase 4 will build the claim flow.
        </div>
      </main>
    </>
  )
}
