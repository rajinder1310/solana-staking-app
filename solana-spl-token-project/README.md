# 🪙 Solana SPL Token & Tax Project (Beginner's Guide)

Welcome! 🎉 This is a **Taxable Token Project** on the Solana Blockchain.

If you are new to Solana, don't worry! This README is designed to take you from a **"Nobby" (Newbie)** to a **Solana Developer**. We will explain *everything*—how the code works, what the weird syntax means, and how to launch your own token.

---

## 📚 Table of Contents
1. [What is this Project?](#-what-is-this-project)
2. [Solana Mental Model (Must Read!)](#-solana-mental-model-must-read)
3. [Syntax Dictionary (Decoding the Code)](#-syntax-dictionary-decoding-the-code)
4. [Code Walkthrough](#-code-walkthrough)
5. [Installation & Setup](#-installation--setup)
6. [How to Deploy & Test](#-how-to-deploy--test)

---

## 🤔 What is this Project?

This is a **Smart Contract** (called a "Program" in Solana) that manages a custom cryptocurrency token.
It's not just a basic token; it has a **Tax Feature**:
*   **Minting:** You can create (print) new tokens.
*   **Transfer with Tax:** When someone sends tokens, a small % is automatically cut and sent to a "Tax Wallet" (like a government tax).
*   **Staking (New!):** Users can now "Deposit" tokens into a secure Vault (Staking Contract) and we record their balance on-chain.

---

## 🧠 Solana Mental Model (Must Read)

Before looking at the code, you need to understand how Solana fails differently from Ethereum/others.

### 1. Program vs. Account (The Calculator Analogy)
*   **Program (The Calculator):** This is the Logic. It sits on the blockchain and processes instructions. It doesn't hold data itself. It's just a machine.
*   **Account (The Paper):** This is where Data is stored. If you want to remember "User A has 50 tokens", you write it on an Account (User A's Token Account).

**Key Takeaway:** You don't "send money to the contract". You "ask the Program to move numbers from User A's Account to User B's Account".

### 2. PDAs (Program Derived Addresses)
A **PDA** is like a special safety box that *only* this Program can open. We use it to store global settings (like the Tax Rate). No user has the private key to it; only the code controls it.

---

## 🔑 PDAs Explained (The 3 Key Components)

In this project, we use **3 different PDAs**. Here is the difference:

| PDA Name | Concept | Analogy | Why we need it? | Encoded Seed |
| :--- | :--- | :--- | :--- | :--- |
| **Global Config** | **The Rulebook** | A Notice Board | Stores global settings like **Admin Address** and **Fee %**. One per program. | `b"config"` |
| **Vault** | **The Safe** | A Bank Vault | Holds all the **Tokens** deposited by users. Secure & Ownerless. | `b"vault" + Mint` |
| **UserStakeInfo** | **The Ledger** | Bank Passbook | Stores **Your Balance**. Tracks how much *YOU* deposited. Unique per user. | `b"user" + YourWallet` |

> **Simple Rule:**
> *   Need to store Money? -> **Vault**
> *   Need to store Rules? -> **Config**
> *   Need to store User Data? -> **UserStakeInfo**

---

## 📖 Syntax Dictionary (Decoding the Code)

You will see these weird words in the code (`lib.rs`). Here is what they mean:

| Syntax | English Translation |
| :--- | :--- |
| **`#[program]`** | **"Hey Solana, start here!"** This is the entry point of your smart contract. |
| **`pub fn ... (ctx: Context<...>)`** | **"Do this Action."** Every function is an action (instruction) a user can trigger. |
| **`Context<StructName>`** | **"The Toolkit."** It contains all the Accounts (wallets, data) needed for this specific action. |
| **`#[derive(Accounts)]`** | **"Security Guard."** It validates the accounts *before* the function runs. (e.g., "Is this signer actually the owner?"). |
| **`#[account(...)]`** | **"Rules for this Account."** Used inside the struct to set rules like `mut` (modifiable), `init` (create new), or `signer` (must sign). |
| **`msg!("...")`** | **"Log this."** Prints a message to the blockchain logs (useful for debugging). |
| **`Ok(())`** | **"Mission Success!"** Tells Solana the function finished correctly. |

---

## 🔍 Code Walkthrough

This project has 3 main actions provided in `programs/token-contract/src/lib.rs`:

### 1. `initialize_mint`
*   **Goal:** Create the "Concept" of the token (The Mint).
*   **What it does:** Sets up the Mint Account (Decimal places, who acts as the authority).
*   **Analogy:** Registering a new currency (like "Dollar") with the central bank.

### 2. `mint_token`
*   **Goal:** Create actual coins.
*   **What it does:** Increases the supply and puts tokens into a user's wallet.
*   **Analogy:** Printing new banknotes and putting them in a vault.

### 3. `transfer_token` (The Special Part!)
*   **Goal:** Send money from Alice to Bob.
*   **The Twist (Tax):**
    1.  Calculates the Tax (e.g., 2%).
    2.  Sends `Amount - Tax` to Bob.
    3.  Sends `Tax` to the Tax Wallet.
    4.  All happens in **one atomic transaction** (creates two transfers internally).

---

## 🏦 Staking Contract (New Feature!)
We have added a second contract: `staking_contract`. Here is how it works:

### 1. The Vault (PDA)
*   **Concept:** We need a safe place to keep user tokens. We can't trust a human with the key.
*   **Solution (PDA):** We create a **Program Derived Address (PDA)**. This is a wallet address that has **NO Private Key**. Only our Code can make it sign transactions.
*   **Analogy:** A digital piggy bank that only opens when the code says "Open".

### 2. User Tracking (`UserStakeInfo`)
*   **Concept:** When you deposit money in a bank, the bank writes in their ledger: *"John deposited $500 on Tuesday"*.
*   **Solution:** We create a specific account (`UserStakeInfo`) for every user.
*   **Data Stored:**
    *   `amount`: How many tokens they staked.
    *   `deposit_ts`: Timestamp (When they deposited).

### 3. `deposit` Function (The Magic)
This function does 3 things in one go:
1.  **CPI (Cross Program Invocation):**
    *   Our Staking Contract talks to the **Solana Token Program** (The Bank Manager).
    *   It says: *"Here is a signed cheque from User. Please move 500 tokens from User's Wallet to my Vault."* (This is the `token::transfer` code).
2.  **Update Ledger:** It adds +500 to the user's `UserStakeInfo` account.
3.  **Emit Log:** It shouts to the world (Event Log): *"User X just staked 500 tokens!"*

### 4. Security Measures
*   **`Signer<'info>`:** We ensure the person calling `deposit` is actually the owner of the wallet (they must sign the transaction).
*   **`seeds = [b"vault", ...]`:** We verify that the Vault address is the REAL Vault, not a fake wallet address injected by a hacker.

### 5. Withdrawal Fee (Dynamic) 💸
*   **Feature:** When a user withdraws, a fee (default 1%) is deducted.
*   **Dynamic:** The Admin can change this fee at any time!
    *   **Instruction:** `update_fee`
    *   **Admin Only:** Only the wallet that deployed the contract can change the fee.
*   **Where does it go?** The fee is sent to a separate **Fee Vault** (Admin's wallet), and the rest goes to the User.

---

## 🛠 Installation & Setup

Follow these steps to get this running on your Linux machine.

### Prerequisites
You need these tools installed:
1.  **Rust**: The programming language.
2.  **Solana CLI**: To talk to the blockchain.
3.  **Anchor**: The framework that makes Solana coding easy.

### 1. Clone the Repo
```bash
git clone https://github.com/rajinder1310/solana-spl-token-project.git
cd solana-spl-token-project
```

### 2. Install Dependencies
```bash
yarn install
```

---

## 🚀 How to Deploy & Test

### 1. Build the Code
This turns your Rust code into a binary executable for Solana.
```bash
anchor build
```

### 2. Run Tests
We have written automated tests in TypeScript (`tests/`) to prove it works.
```bash
anchor test
```
*If you see green checkmarks, you are good to go!*

### 3. Deploy to Devnet (Test Network)
Want to put it on the real internet (but with fake money)?
```bash
# Set your config to Devnet
solana config set --url devnet

# Deploy
anchor deploy
```

---

## 🤝 Need Help?
Check out `programs/token-contract/EXPLANATION.md` for a deeper dive into the specific logic vs data concepts!
