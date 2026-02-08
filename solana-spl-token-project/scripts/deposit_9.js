const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey, Keypair, SystemProgram } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createMintToInstruction } = require("@solana/spl-token");
const fs = require("fs");

async function depositNineTokens() {
  console.log("\n🚀 Depositing 9 tokens...\n");

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const deployerKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync("/home/user/.config/solana/deployer.json", "utf-8")))
  );

  const wallet = new anchor.Wallet(deployerKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

  const idl = JSON.parse(fs.readFileSync("./target/idl/staking_contract.json", "utf-8"));
  const programId = new PublicKey("9vF8iR37L3nKtBR4x6mhy8dE8eMLUzcuCNbSCGCpnYHG");
  const program = new anchor.Program(idl, programId, provider);

  const USER_PUBKEY = new PublicKey("HfLwDVax4RaftkctDGGw5a84jheVZtSint919Xy9D3dD");
  const TOKEN_MINT = new PublicKey("2hSMP1YD9zzJG4jr8gxB4Xkond77jdQnP7uqHcp9wZLa");

  const userTokenAccount = await getAssociatedTokenAddress(TOKEN_MINT, USER_PUBKEY);

  // Mint 9 tokens first
  const mintAmount = 9 * 1_000_000_000;
  console.log(`💰 Minting 9 tokens...`);

  const mintTx = await connection.sendTransaction(
    new anchor.web3.Transaction().add(
      createMintToInstruction(TOKEN_MINT, userTokenAccount, deployerKeypair.publicKey, mintAmount)
    ),
    [deployerKeypair]
  );

  await connection.confirmTransaction(mintTx, "confirmed");
  console.log(`✅ Minted!\n`);

  // Deposit
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
  const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from("vault"), TOKEN_MINT.toBuffer()], programId);
  const [userStakeInfoPda] = PublicKey.findProgramAddressSync([Buffer.from("user"), USER_PUBKEY.toBuffer()], programId);

  const depositAmount = new anchor.BN(9 * 1_000_000_000);
  console.log(`💰 Depositing 9 tokens...`);

  const tx = await program.methods
    .deposit(depositAmount)
    .accounts({
      staker: USER_PUBKEY,
      vault: vaultPda,
      stakeInfo: userStakeInfoPda,
      mint: TOKEN_MINT,
      stakerTokenAccount: userTokenAccount,
      config: configPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([deployerKeypair])
    .rpc();

  console.log(`\n✅ DEPOSIT SUCCESS!`);
  console.log(`Tx: ${tx}`);
  console.log(`\n🔍 Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet\n`);

  await connection.confirmTransaction(tx, "confirmed");
  console.log(`✅ Confirmed!\n`);

  console.log(`⏳ Indexer should detect this automatically within 1-2 seconds...`);
  console.log(`   Check: tail -f indexer.log`);
  console.log(`   Or run: node check_new_event.js\n`);
}

depositNineTokens().catch(console.error);
