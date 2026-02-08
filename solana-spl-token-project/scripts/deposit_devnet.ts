import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, SystemProgram, clusterApiUrl } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import * as fs from "fs";
import idl from "../target/idl/staking_contract.json";

async function depositTokens() {
  console.log("\n🚀 Starting deposit of 1999 tokens to Devnet...\n");

  // Connect to Devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Load deployer wallet (will be the signer)
  const deployerKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync("/home/user/.config/solana/deployer.json", "utf-8")))
  );

  const wallet = new Wallet(deployerKeypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });

  // Program ID
  const programId = new PublicKey("9vF8iR37L3nKtBR4x6mhy8dE8eMLUzcuCNbSCGCpnYHG");
  const program = new Program(idl as any, programId, provider);

  // User account (the one making the deposit)
  const USER_PUBKEY = new PublicKey("HfLwDVax4RaftkctDGGw5a84jheVZtSint919Xy9D3dD");

  // Token mint
  const TOKEN_MINT = new PublicKey("2hSMP1YD9zzJG4jr8gxB4Xkond77jdQnP7uqHcp9wZLa");

  console.log(`User: ${USER_PUBKEY.toString()}`);
  console.log(`Token Mint: ${TOKEN_MINT.toString()}`);
  console.log(`Program: ${programId.toString()}\n`);

  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), TOKEN_MINT.toBuffer()],
    programId
  );

  const [userStakeInfoPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_stake_info"), USER_PUBKEY.toBuffer(), TOKEN_MINT.toBuffer()],
    programId
  );

  // Get user's token account
  const userTokenAccount = await getAssociatedTokenAddress(
    TOKEN_MINT,
    USER_PUBKEY
  );

  // Amount to deposit (1999 tokens with 9 decimals)
  const depositAmount = new anchor.BN(1999 * 1_000_000_000);

  console.log(`💰 Depositing: ${depositAmount.toString()} (1999 tokens)\n`);

  try {
    const tx = await program.methods
      .deposit(depositAmount)
      .accounts({
        staker: USER_PUBKEY,
        config: configPda,
        userStakeInfo: userStakeInfoPda,
        userTokenAccount: userTokenAccount,
        vault: vaultPda,
        tokenMint: TOKEN_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([deployerKeypair]) // Deployer signs the transaction
      .rpc();

    console.log(`✅ Deposit successful!`);
    console.log(`Transaction signature: ${tx}`);
    console.log(`\n🔍 View on Solana Explorer:`);
    console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);

    // Wait for confirmation
    await connection.confirmTransaction(tx, "confirmed");
    console.log(`✅ Transaction confirmed!\n`);

    // Fetch updated stake info
    const stakeInfo = await program.account.userStakeInfo.fetch(userStakeInfoPda);
    console.log(`📊 Updated Stake Info:`);
    console.log(`Total Staked: ${stakeInfo.totalStaked.toString()}`);
    console.log(`Staker: ${stakeInfo.staker.toString()}\n`);

    console.log(`⏳ Waiting 10 seconds for indexer to pick up the event...\n`);
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error: any) {
    console.error("\n❌ Deposit failed:");
    console.error(error.message || error);
    if (error.logs) {
      console.error("\nProgram logs:");
      error.logs.forEach((log: string) => console.error(log));
    }
    throw error;
  }
}

depositTokens().catch(console.error);
