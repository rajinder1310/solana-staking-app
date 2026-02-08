import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenContract } from "../target/types/token_contract";
import { TOKEN_PROGRAM_ID, createAccount, getAccount } from "@solana/spl-token";
import { assert } from "chai";

describe("token-contract-tests", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TokenContract as Program<TokenContract>;

  // Accounts
  const mintKeypair = anchor.web3.Keypair.generate();
  const mnint = mintKeypair.publicKey;
  const payer = provider.wallet as anchor.Wallet;

  // PDAs
  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  // Users & Wallets
  let tokenAccountA: anchor.web3.PublicKey; // Sender
  let tokenAccountB: anchor.web3.PublicKey; // Receiver
  let taxWalletKeypair = anchor.web3.Keypair.generate();
  let taxWallet: anchor.web3.PublicKey;
  let hackerKeypair = anchor.web3.Keypair.generate(); // For negative testing

  // Constants
  const DECIMALS = 9;
  const INITIAL_TAX_BPS = 100; // 1%
  const UPDATED_TAX_BPS = 200; // 2%
  const MINT_AMOUNT = 1000;
  const TRANSFER_AMOUNT = 100;

  before(async () => {
    // Airdrop SOL to hacker for fee payment
    const signature = await provider.connection.requestAirdrop(hackerKeypair.publicKey, 1000000000); // 1 SOL
    await provider.connection.confirmTransaction(signature);
  });

  // ==============================================================================
  // ✅ POSITIVE TEST CASES (Happy Path)
  // ==============================================================================

  it("POSITIVE: Initialize Mint", async () => {
    await program.methods
      .initializeMint(DECIMALS)
      .accounts({
        mint: mnint,
        payer: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    console.log("   -> Mint Initialized");
  });

  it("POSITIVE: Initialize Config (Tax Setup)", async () => {
    // Create Tax Wallet Token Account first (needs to exist to be a valid account)
    // Actually, tax_wallet in initialize_config is just an Account (TokenAccount) or Pubkey?
    // Looking at lib.rs: pub tax_wallet: Account<'info, TokenAccount>
    // So we need to create a token account for the tax wallet first.

    taxWallet = await createAccount(
      provider.connection,
      payer.payer,
      mnint,
      taxWalletKeypair.publicKey
    );

    await program.methods
      .initializeConfig(INITIAL_TAX_BPS)
      .accounts({
        config: configPda,
        taxWallet: taxWallet,
        authority: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const configAccount = await program.account.tokenConfig.fetch(configPda);
    assert.equal(configAccount.taxBasisPoints, INITIAL_TAX_BPS);
    assert.ok(configAccount.authority.equals(payer.publicKey));
    assert.ok(configAccount.taxWallet.equals(taxWallet));
    console.log("   -> Config Initialized with 1% Tax");
  });

  it("POSITIVE: Mint Tokens to User A", async () => {
    tokenAccountA = await createAccount(
      provider.connection,
      payer.payer,
      mnint,
      payer.publicKey
    );

    await program.methods
      .mintToken(new anchor.BN(MINT_AMOUNT))
      .accounts({
        mint: mnint,
        tokenAccount: tokenAccountA,
        authority: payer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const bal = await getAccount(provider.connection, tokenAccountA);
    assert.equal(bal.amount.toString(), MINT_AMOUNT.toString());
    console.log("   -> Minted 1000 Tokens to User A");
  });

  it("POSITIVE: Admin Updates Tax Rate", async () => {
    await program.methods
      .updateConfig(UPDATED_TAX_BPS) // Change to 2%
      .accounts({
        config: configPda,
        authority: payer.publicKey,
      })
      .rpc();

    const configAccount = await program.account.tokenConfig.fetch(configPda);
    assert.equal(configAccount.taxBasisPoints, UPDATED_TAX_BPS);
    console.log("   -> Tax Updated to 2%");
  });

  it("POSITIVE: Transfer with Tax Deduction", async () => {
    // Setup Receiver
    const userBKeypair = anchor.web3.Keypair.generate();
    tokenAccountB = await createAccount(
      provider.connection,
      payer.payer,
      mnint,
      userBKeypair.publicKey
    );

    // Initial Balances
    const taxWalletBefore = await getAccount(provider.connection, taxWallet);
    const taxBefore = Number(taxWalletBefore.amount);

    // Transfer 100 Tokens. Tax is 2% (2 tokens).
    // Receiver should get 98. Tax Wallet should get +2.

    await program.methods
      .transferToken(new anchor.BN(TRANSFER_AMOUNT))
      .accounts({
        from: tokenAccountA,
        to: tokenAccountB,
        taxWallet: taxWallet, // Must match config
        config: configPda,
        authority: payer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    // Verify User B Balance
    const accountB = await getAccount(provider.connection, tokenAccountB);
    assert.equal(accountB.amount.toString(), "98");

    // Verify Tax Wallet Balance
    const taxWalletAfter = await getAccount(provider.connection, taxWallet);
    const taxAfter = Number(taxWalletAfter.amount);
    assert.equal(taxAfter - taxBefore, 2);

    console.log("   -> Transfer Successful: 98 received, 2 tax deducted");
  });


  // ==============================================================================
  // ⛔ NEGATIVE TEST CASES (Security Checks)
  // ==============================================================================

  it("NEGATIVE: Hacker cannot update Config", async () => {
    try {
      await program.methods
        .updateConfig(5000) // Try to set 50% tax
        .accounts({
          config: configPda,
          authority: hackerKeypair.publicKey, // Wrong Authority
        })
        .signers([hackerKeypair])
        .rpc();

      assert.fail("Should have failed with unauthorized error");
    } catch (err) {
      assert.ok(err.toString().includes("ConstraintHasOne"), "Expected ConstraintHasOne error"); // or signature verification error depending on anchor version checks
      console.log("   -> Blocked: Unauthorized config update prevented");
    }
  });

  it("NEGATIVE: Transfer with Wrong Tax Wallet FAILS", async () => {
    // Create a fake tax wallet
    const fakeTaxWallet = await createAccount(
      provider.connection,
      payer.payer,
      mnint,
      hackerKeypair.publicKey
    );

    try {
      await program.methods
        .transferToken(new anchor.BN(50))
        .accounts({
          from: tokenAccountA,
          to: tokenAccountB,
          taxWallet: fakeTaxWallet, // PASSING WRONG WALLET
          config: configPda,
          authority: payer.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      assert.fail("Should have failed due to wrong tax wallet");
    } catch (err) {
      // We expect a constraint error because `has_one = tax_wallet` in the struct
      assert.ok(err.toString().includes("ConstraintHasOne") || err.toString().includes("ConstraintRaw"), "Expected constraint error");
      console.log("   -> Blocked: Transfer with fake tax wallet prevented");
    }
  });

});
