use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::state::*;
use crate::errors::ErrorCode;
use crate::constants::ADMIN_PUBKEY;

pub fn initialize(ctx: Context<Initialize>, initial_fee_bps: u64) -> Result<()> {
    // 1. Check that the caller is ADMIN.
    require_keys_eq!(ctx.accounts.payer.key(), ADMIN_PUBKEY, ErrorCode::Unauthorized);

    // Global Config Setup
    let config = &mut ctx.accounts.config;
    config.admin = ADMIN_PUBKEY;
    config.withdraw_fee_bps = initial_fee_bps;

    msg!("Staking Vault & Config Initialized! Initial Fee: {} bps", initial_fee_bps);
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,                               // Create new account
        payer = payer,                      // 'payer' pays for creating this account
        seeds = [b"vault", mint.key().as_ref()], // This account is a PDA (Deterministic address)
        bump,                               // Bump seed to avoid collision
        token::mint = mint,                 // Which token this account holds
        token::authority = vault,           // Owner is itself (Vault PDA)
    )]
    pub vault: Account<'info, TokenAccount>, // Account where everyone's money is stored

    pub mint: Account<'info, Mint>,          // Token main address

    #[account(mut)]
    pub payer: Signer<'info>,                // Who pays fees (Admin)

    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 8, // Discriminator + Pubkey + u64
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, GlobalConfig>, // Global Config Account

    pub system_program: Program<'info, System>, // Solana system program
    pub token_program: Program<'info, Token>,   // SPL Token program
}
