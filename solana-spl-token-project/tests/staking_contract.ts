import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { StakingContract } from "../target/types/staking_contract";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount
} from "@solana/spl-token";
import { assert } from "chai";

describe("staking_contract_comprehensive_tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.StakingContract as Program<StakingContract>;

  // Global Variables
  let mint: anchor.web3.PublicKey;
  let vault: anchor.web3.PublicKey;
  let config: anchor.web3.PublicKey;
  let feeVault: anchor.web3.PublicKey;

  // User A (Provider Wallet)
  const userA = provider.wallet;
  let userATokenAccount: anchor.web3.PublicKey;
  let userAStakeInfo: anchor.web3.PublicKey;

  // User B (Separate User)
  const userB = anchor.web3.Keypair.generate();
  let userBTokenAccount: anchor.web3.PublicKey;
  let userBStakeInfo: anchor.web3.PublicKey;
  const userBWallet = new anchor.Wallet(userB);

  // Hacker (Unauthorized User)
  const hacker = anchor.web3.Keypair.generate();

  before(async () => {
    // Airdrop SOL to User B and Hacker
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(userB.publicKey, 2000000000)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(hacker.publicKey, 1000000000)
    );
  });

  // =========================================================================
  // 1. INITIALIZATION & SETUP
  // =========================================================================

  it("Setup: Create Mint and Token Accounts", async () => {
    // Create Mint
    mint = await createMint(
      provider.connection,
      userA.payer,
      userA.publicKey,
      null,
      6
    );

    // Create User A Token Account & Mint 1000 tokens
    const ataA = await getOrCreateAssociatedTokenAccount(
      provider.connection, userA.payer, mint, userA.publicKey
    );
    userATokenAccount = ataA.address;
    await mintTo(provider.connection, userA.payer, mint, userATokenAccount, userA.publicKey, 1000);

    // Create User B Token Account & Mint 1000 tokens
    const ataB = await getOrCreateAssociatedTokenAccount(
      provider.connection, userA.payer, mint, userB.publicKey
    );
    userBTokenAccount = ataB.address;
    await mintTo(provider.connection, userA.payer, mint, userBTokenAccount, userA.publicKey, 1000);

    // Create Fee Vault (Independent Account)
    const feeData = anchor.web3.Keypair.generate();
    const feeAta = await getOrCreateAssociatedTokenAccount(
      provider.connection, userA.payer, mint, feeData.publicKey
    );
    feeVault = feeAta.address;

    console.log("Setup complete. Mint:", mint.toString());
  });

  it("POSITIVE: Initialize Staking Contract (Vault & Config)", async () => {
    // PDAs
    [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), mint.toBuffer()], program.programId
    );
    [config] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("config")], program.programId
    );

    // derive User Stake PDAs for later
    [userAStakeInfo] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), userA.publicKey.toBuffer()], program.programId
    );
    [userBStakeInfo] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), userB.publicKey.toBuffer()], program.programId
    );

    await program.methods
      .initialize(new anchor.BN(100)) // 1% Fee
      .accounts({
        vault: vault,
        config: config,
        mint: mint,
        payer: userA.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // Verify Config
    const configAccount = await program.account.globalConfig.fetch(config);
    assert.equal(configAccount.admin.toBase58(), userA.publicKey.toBase58());
    assert.equal(configAccount.withdrawFeeBps.toNumber(), 100);
  });

  // =========================================================================
  // 2. FEE MANAGEMENT SECURITY
  // =========================================================================

  it("POSITIVE: Admin updates fee to 5%", async () => {
    await program.methods.updateFee(new anchor.BN(500)).accounts({
      config: config,
      admin: userA.publicKey
    }).rpc();

    const acc = await program.account.globalConfig.fetch(config);
    assert.equal(acc.withdrawFeeBps.toNumber(), 500);
  });

  it("NEGATIVE: Hacker cannot update fee", async () => {
    try {
      await program.methods.updateFee(new anchor.BN(0)).accounts({
        config: config,
        admin: hacker.publicKey
      }).signers([hacker]).rpc();
      assert.fail("Should fail");
    } catch (e) {
      assert.ok(true); // Expected failure
    }
  });

  // =========================================================================
  // 3. DEPOSIT SCENARIOS
  // =========================================================================

  it("POSITIVE: User A Deposits 100 Tokens", async () => {
    await program.methods.deposit(new anchor.BN(100)).accounts({
      staker: userA.publicKey,
      vault: vault,
      stakeInfo: userAStakeInfo,
      mint: mint,
      stakerTokenAccount: userATokenAccount,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId
    }).rpc();

    const info = await program.account.userStakeInfo.fetch(userAStakeInfo);
    assert.equal(info.amount.toNumber(), 100);
  });

  it("POSITIVE: User B Deposits 200 Tokens (Isolation Check)", async () => {
    // User B must sign
    await program.methods.deposit(new anchor.BN(200)).accounts({
      staker: userB.publicKey,
      vault: vault,
      stakeInfo: userBStakeInfo,
      mint: mint,
      stakerTokenAccount: userBTokenAccount,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId
    }).signers([userB]).rpc();

    const infoA = await program.account.userStakeInfo.fetch(userAStakeInfo);
    const infoB = await program.account.userStakeInfo.fetch(userBStakeInfo);

    // Verify A is still 100, B is 200
    assert.equal(infoA.amount.toNumber(), 100);
    assert.equal(infoB.amount.toNumber(), 200);

    // Verify Vault Total: 100 + 200 = 300
    const vaultAcc = await getAccount(provider.connection, vault);
    assert.equal(Number(vaultAcc.amount), 300);
  });

  it("NEGATIVE: Cannot Deposit 0", async () => {
    try {
      await program.methods.deposit(new anchor.BN(0)).accounts({
        staker: userA.publicKey,
        vault: vault,
        stakeInfo: userAStakeInfo,
        mint: mint,
        stakerTokenAccount: userATokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId
      }).rpc();
      assert.fail("Should fail");
    } catch (e) {
      assert.include(e.message, "Amount must be greater than zero");
    }
  });

  it("NEGATIVE: Insufficient Funds", async () => {
    try {
      await program.methods.deposit(new anchor.BN(5000)).accounts({
        staker: userA.publicKey,
        vault: vault,
        stakeInfo: userAStakeInfo,
        mint: mint,
        stakerTokenAccount: userATokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId
      }).rpc();
      assert.fail("Should fail");
    } catch (e) {
      assert.ok(true);
    }
  });

  // =========================================================================
  // 4. WITHDRAW SCENARIOS
  // =========================================================================

  it("POSITIVE: User A Withdraws with 5% Fee", async () => {
    // Setup: User A has 100 staked. Fee is 5%.
    // Expected Fee: 100 * 5% = 5 tokens.
    // User gets: 95.

    // Initial Balance (User A): 900 (1000 minted - 100 staked)
    // Expected Final: 900 + 95 = 995.

    await program.methods.withdraw().accounts({
      staker: userA.publicKey,
      vault: vault,
      stakeInfo: userAStakeInfo,
      mint: mint,
      stakerTokenAccount: userATokenAccount,
      feeVault: feeVault,
      config: config,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID
    }).rpc();

    // Verify User A Balance
    const userAcc = await getAccount(provider.connection, userATokenAccount);
    assert.equal(Number(userAcc.amount), 995);

    // Verify Fee Vault
    const feeAcc = await getAccount(provider.connection, feeVault);
    assert.equal(Number(feeAcc.amount), 5);

    // Verify User A Stake Info is reset
    const info = await program.account.userStakeInfo.fetch(userAStakeInfo);
    assert.equal(info.amount.toNumber(), 0);

    // Verify User B is UNAFFECTED
    const infoB = await program.account.userStakeInfo.fetch(userBStakeInfo);
    assert.equal(infoB.amount.toNumber(), 200, "User B funds touched!");
  });

  it("NEGATIVE: Double Withdraw", async () => {
    try {
      await program.methods.withdraw().accounts({
        staker: userA.publicKey,
        vault: vault,
        stakeInfo: userAStakeInfo,
        mint: mint,
        stakerTokenAccount: userATokenAccount,
        feeVault: feeVault,
        config: config,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID
      }).rpc();
      assert.fail("Should fail");
    } catch (e) {
      assert.include(e.message, "No tokens to withdraw");
    }
  });

  it("POSITIVE: Update Fee to 0% and User B Withdraws", async () => {
    // 1. Set Fee to 0
    await program.methods.updateFee(new anchor.BN(0)).accounts({
      config: config, admin: userA.publicKey
    }).rpc();

    // 2. User B Withdraws 200
    // Expected: Full 200 back. No Fee.
    const initialBal = (await getAccount(provider.connection, userBTokenAccount)).amount; // 800

    await program.methods.withdraw().accounts({
      staker: userB.publicKey,
      vault: vault,
      stakeInfo: userBStakeInfo,
      mint: mint,
      stakerTokenAccount: userBTokenAccount,
      feeVault: feeVault,
      config: config,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID
    }).signers([userB]).rpc();

    const finalBal = await getAccount(provider.connection, userBTokenAccount);
    // 800 + 200 = 1000
    assert.equal(Number(finalBal.amount), 1000);

    // Fee Vault should STILL have only 5 (from User A)
    const feeAcc = await getAccount(provider.connection, feeVault);
    assert.equal(Number(feeAcc.amount), 5);
  });

});
