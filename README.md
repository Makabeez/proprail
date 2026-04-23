\# PropRail



> USDC payout rail for prop-trading firms. Built on \[Arc Testnet](https://docs.arc.network), powered by \[Circle Bridge Kit](https://developers.circle.com/bridge-kit) and \[CCTP V2](https://developers.circle.com/stablecoins/cctp-getting-started).



Prop-trading firms pay their funded traders in USD-equivalent amounts, often to traders scattered across jurisdictions. PropRail gives them a one-page dashboard to fund a treasury, issue payouts with expiry, and hand traders a claim link. The trader opens the link, picks which chain they want their USDC on, and signs once. Circle's CCTP V2 handles the crosschain delivery; the trader doesn't need gas on the destination chain.



\## Live



\- \*\*Contract (verified):\*\* \[`0xF46E0b43AEf82114DA8a8F62D66bb7b63D3b00b7`](https://testnet.arcscan.app/address/0xF46E0b43AEf82114DA8a8F62D66bb7b63D3b00b7) on Arc Testnet

\- \*\*Demo:\*\* coming soon (Vercel deploy in progress)



\## How it works



┌─────────────────────────────────────┐

&#x20;      │     Prop firm admin (you)           │

&#x20;      │  ─────────────────────────────      │

&#x20;      │  1. Deposit USDC to escrow          │

&#x20;      │  2. Create payout(s) with expiry    │

&#x20;      │  3. Share claim link with trader    │

&#x20;      └──────────────────┬──────────────────┘

&#x20;                         │

&#x20;                         │  onchain

&#x20;                         ▼

&#x20;      ┌─────────────────────────────────────┐

&#x20;      │   PayoutEscrow.sol  (Arc Testnet)   │

&#x20;      │  ─────────────────────────────      │

&#x20;      │  - treasury pool                    │

&#x20;      │  - pending payouts (id → trader)    │

&#x20;      │  - committed vs unallocated         │

&#x20;      └──────────────────┬──────────────────┘

&#x20;                         │

&#x20;                         │  trader opens claim link

&#x20;                         ▼

&#x20;      ┌─────────────────────────────────────┐

&#x20;      │      Trader claim page              │

&#x20;      │  ─────────────────────────────      │

&#x20;      │  - picks destination chain          │

&#x20;      │  - signs claim() on Arc             │

&#x20;      │  - CCTP burns USDC via contract     │

&#x20;      │  - Bridge Kit polls attestation     │

&#x20;      │  - Orbit forwarder mints on dest    │

&#x20;      └──────────────────┬──────────────────┘

&#x20;                         │

&#x20;                         ▼

&#x20;   Base Sepolia / Ethereum Sepolia / Arbitrum Sepolia

&#x20;        (trader has USDC, no gas needed)



\## Why Arc + Bridge Kit



\- \*\*USDC-as-gas on Arc\*\* means the prop firm funds the treasury in one asset and pays fees in the same asset. No second token to source.

\- \*\*CCTP V2 via Bridge Kit\*\* means the trader gets native USDC on their chosen chain, not a bridged wrapper. And with the Orbit forwarder, the trader doesn't need ETH on the destination.

\- \*\*Single signature UX\*\* — the trader signs once on Arc; everything downstream is handled by Circle's infrastructure.



\## Features



\- 🏦 \*\*Admin dashboard\*\* with live treasury balance, committed vs unallocated USDC, deposit/withdraw flow

\- 📋 \*\*Single and batch payout creation\*\* — upload a CSV for bulk airdrops

\- 📊 \*\*Live payout history\*\* reading onchain events (topic-filtered, chunked)

\- 🔗 \*\*Shareable claim links\*\* per payout (`/claim/\[id]`)

\- 🌉 \*\*Crosschain claim flow\*\* — trader picks Base Sepolia / Ethereum Sepolia / Arbitrum Sepolia

\- 🎯 \*\*Owner-gated admin access\*\* — admin dashboard reads the contract's `owner()` and locks out other wallets

\- ⏲️ \*\*Payout expiry\*\* — firm can reclaim expired payouts



\## Tech stack



| Layer | Choice |

|---|---|

| Smart contract | Solidity 0.8.22, OpenZeppelin 5.1.0, Foundry |

| Frontend | Next.js 16 (App Router) |

| Wallet | RainbowKit 2 + wagmi 2 + viem 2 |

| Crosschain | @circle-fin/bridge-kit 1.8.3 + @circle-fin/provider-cctp-v2 |

| Chain | \[Arc Testnet](https://docs.arc.network) (chain id 5042002, USDC as gas) |



\## Contract



`PayoutEscrow.sol` is a small escrow (\~200 lines) with these responsibilities:



\- \*\*Treasury\*\*: owner deposits and withdraws USDC

\- \*\*Payout commitments\*\*: owner creates pending payouts (trader, amount, reference, expiry)

\- \*\*Claim\*\*: trader executes `claim(payoutId, destinationDomain, mintRecipient, maxFee, minFinalityThreshold)`. The contract approves Circle's TokenMessengerV2 and calls `depositForBurn`, burning USDC on Arc and emitting a CCTP message for the destination chain.

\- \*\*Reclaim\*\*: owner can cancel any expired pending payout



Access control via OpenZeppelin `Ownable`. Reentrancy-guarded on `claim()`. 16 Foundry tests covering happy paths, access control, and invariants — all passing.



\## Local development



```bash

\# Clone

git clone https://github.com/Makabeez/proprail.git

cd proprail



\# Frontend

npm install

cp .env.local.example .env.local  # fill in NEXT\_PUBLIC\_WALLETCONNECT\_PROJECT\_ID

npm run dev



\# Contract (optional — deployed instance already on Arc Testnet)

cd contracts

forge install

forge test

```



\## Repo layout



contracts/                  Foundry project

├── src/

│   ├── PayoutEscrow.sol         main contract

│   └── interfaces/ITokenMessengerV2.sol

└── test/PayoutEscrow.t.sol      16 tests

src/

├── app/

│   ├── admin/page.tsx           admin dashboard page

│   └── claim/\[id]/page.tsx      trader claim page

├── components/

│   ├── admin/                   Treasury, CreatePayout, PayoutHistory

│   └── claim/                   ClaimForm, ClaimProgress, ClaimSuccess

└── lib/

├── bridge/                  Bridge Kit integration

├── abi/payoutEscrow.ts      contract ABI

├── chains.ts                wagmi chain def for Arc Testnet

└── contracts.ts             deployed contract addresses



\## Roadmap



\- \[ ] Vercel deploy + live demo URL

\- \[ ] `claimToSelf()` variant for traders who want USDC on Arc directly

\- \[ ] Solana Devnet as a claim destination (Bridge Kit supports it)

\- \[ ] Custom fee routing for firms taking a payout fee

\- \[ ] EURC payouts (Arc supports EURC natively)



\## License



MIT.



\---



Built in the open to explore Circle's Arc + Bridge Kit stack. Feedback welcome — \[open an issue](https://github.com/Makabeez/proprail/issues) or ping \[@Makabeez](https://github.com/Makabeez).





