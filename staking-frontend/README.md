# Premium Solana Staking Platform

A production-grade Next.js frontend for Solana token staking with Material UI.

## ✨ Features

- 🎨 **Premium UI** - Material UI with vibrant gradients and animations
- 💼 **Wallet Integration** - Phantom, Solflare, and more via Solana Wallet Adapter
- 💰 **Staking Operations** - Deposit and withdraw tokens seamlessly
- 📊 **Real-time Stats** - View your staked balance and wallet info
- 📜 **Transaction History** - Track all your staking activities
- 🔒 **Secure** - Direct interaction with audited smart contracts

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (or use with warnings on 18.20.8)
- Phantom or Solflare wallet extension

### Installation

```bash
cd staking-frontend
npm install
```

### Environment Setup

Create `.env.local`:

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=9vF8iR37L3nKtBR4x6mhy8dE8eMLUzcuCNbSCGCpnYHG
NEXT_PUBLIC_TOKEN_MINT=2hSMP1YD9zzJG4jr8gxB4Xkond77jdQnP7uqHcp9wZLa
NEXT_PUBLIC_INDEXER_API=http://localhost:3001
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
staking-frontend/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Home page
│   ├── globals.css         # Global styles
│   └── api/
│       └── events/         # API routes
├── components/
│   ├── layout/
│   │   └── Header.tsx      # App header with wallet button
│   ├── providers/
│   │   └── SolanaProvider.tsx  # Wallet adapter provider
│   └── staking/
│       ├── StakingDashboard.tsx    # Main dashboard
│       ├── StakingStats.tsx        # Stats cards
│       └── TransactionHistory.tsx  # Transaction list
├── hooks/
│   └── useStakingProgram.ts    # Anchor program hook
├── lib/
│   ├── theme.ts            # Material UI theme
│   └── idl/
│       └── staking_contract.json   # Program IDL
└── styles/                 # SCSS with BEM (optional)
```

## 🎨 Theme

The app uses a custom Material UI theme with:
- **Primary**: Purple gradient (#9945FF)
- **Secondary**: Green gradient (#14F195)
- **Dark Mode**: Optimized for dark backgrounds
- **Animations**: Smooth transitions and hover effects

## 🔧 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI Library**: Material UI v6
- **Blockchain**: Solana Web3.js + Anchor
- **Wallet**: Solana Wallet Adapter
- **Styling**: Material UI + SCSS (BEM)
- **TypeScript**: Full type safety

## 📝 Usage

### Connect Wallet

1. Click "Select Wallet" button
2. Choose Phantom or Solflare
3. Approve connection

### Deposit Tokens

1. Enter amount in "Deposit Tokens" card
2. Click "Deposit"
3. Approve transaction in wallet

### Withdraw Tokens

1. Enter amount in "Withdraw Tokens" card
2. Click "Withdraw"
3. Approve transaction in wallet

## 🔗 Integration

The frontend connects to:
- **Solana Devnet** for blockchain transactions
- **Staking Contract** at `9vF8iR37L3nKtBR4x6mhy8dE8eMLUzcuCNbSCGCpnYHG`
- **Event Indexer** (optional) for transaction history

## 🐛 Troubleshooting

### Node Version Warning

The app shows Node.js version warnings but works on 18.20.8. For best experience, upgrade to Node 20+.

### Wallet Not Connecting

1. Ensure wallet extension is installed
2. Check if wallet is unlocked
3. Try refreshing the page

### Transaction Failing

1. Ensure you have enough SOL for gas fees
2. Check token balance
3. Verify you're on Devnet

## 📄 License

MIT
