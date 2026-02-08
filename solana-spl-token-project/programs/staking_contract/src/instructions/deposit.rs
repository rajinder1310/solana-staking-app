use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use crate::state::*;
use crate::errors::ErrorCode;
use crate::events::TokensStaked;

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // 1. Check that amount must be greater than 0.
    require!(amount > 0, ErrorCode::InvalidAmount);

    let staker = &mut ctx.accounts.staker;
    let stake_info = &mut ctx.accounts.stake_info;

    // 2. Token Transfer Logic (User -> Vault)
    // Creates instruction to transfer funds from user's account to vault.
    let transfer_instruction = token::Transfer {
        from: ctx.accounts.staker_token_account.to_account_info(), // From where (User)
        to: ctx.accounts.vault.to_account_info(),                  // To where (Vault)
        authority: staker.to_account_info(),                       // Whose permission (User)
    };

    // Created CPI (Cross Program Invocation) Context for Token Program.
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        transfer_instruction,
    );

    // Actual transfer executes here using Anchor's token helper.
    token::transfer(cpi_ctx, amount)?;

    // 3. Update User Record (Update user's ledger)
    // Record in stake info account how much deposited and when.
    stake_info.amount += amount; // Added amount
    stake_info.deposit_ts = Clock::get()?.unix_timestamp; // Stored current time

    // 4. Emit Event (Generate log for frontend)
    emit!(TokensStaked {
        staker: staker.key(),
        amount,
        total_staked: stake_info.amount,
    });

    msg!("Staked {} tokens successfully. Total: {}", amount, stake_info.amount);
    Ok(())
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub staker: Signer<'info>, // Person depositing (Signer)

    #[account(
        mut,
        seeds = [b"vault", mint.key().as_ref()], // Find the same vault initialized earlier
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,                     // Create account if user visits for first time
        payer = staker,                     // Staker pays fees
        space = 8 + 8 + 8,                  // RAM space needed (Discriminator + u64 + i64)
        seeds = [b"user", staker.key().as_ref()], // Each user has unique PDA based on wallet address
        bump
    )]
    pub stake_info: Account<'info, UserStakeInfo>, // User's personal ledger

    pub mint: Account<'info, Mint>, // Token Mint

    #[account(mut)]
    pub staker_token_account: Account<'info, TokenAccount>, // User ka token wallet jahan se paise katenge

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
