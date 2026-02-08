const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair } = require("@solana/web3.js");
const { mintTo, getOrCreateAssociatedTokenAccount } = require("@solana/spl-token");
const fs = require("fs");

async function mintTokens() {
  // Connect to devnet
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");

  // Load wallet
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync("/home/user/.config/solana/id.json")))
  );

  console.log("Wallet:", walletKeypair.publicKey.toString());

  // Token mint address
  const tokenMint = new PublicKey("2hSMP1YD9zzJG4jr8gxB4Xkond77jdQnP7uqHcp9wZLa");

  // Get or create token account
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    walletKeypair,
    tokenMint,
    walletKeypair.publicKey
  );

  console.log("Token Account:", tokenAccount.address.toString());

  // Mint 1000 tokens (1000 * 10^9 = 1000000000000)
  const amount = 1000 * 1_000_000_000;

  console.log("Minting 1000 tokens...");

  const signature = await mintTo(
    connection,
    walletKeypair,
    tokenMint,
    tokenAccount.address,
    walletKeypair, // Mint authority
    amount
  );

  console.log("✅ Minted 1000 tokens!");
  console.log("Transaction signature:", signature);
  console.log("Token Account:", tokenAccount.address.toString());
  console.log("\nYou can now use these tokens for staking!");
}

mintTokens().catch(console.error);
