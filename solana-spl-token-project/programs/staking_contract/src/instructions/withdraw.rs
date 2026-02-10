use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use crate::state::*;
use crate::errors::ErrorCode;
use crate::events::TokensWithdrawn;

pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
    let stake_info = &mut ctx.accounts.stake_info;
    let staker = &mut ctx.accounts.staker;

    // 1. Check Balance (Is there money in the account?)
    // If balance is 0, throw error.
    require!(stake_info.amount > 0, ErrorCode::InvalidWithdraw);

    // Security Check: Ensure fee_vault belongs to admin
    require_keys_eq!(ctx.accounts.fee_vault.owner, ctx.accounts.config.admin, ErrorCode::Unauthorized);

    let total_amount = stake_info.amount; // Withdraw everything

    // Dynamic Fee Calculation
    // Read current fee rate from config
    let fee_bps = ctx.accounts.config.withdraw_fee_bps;

    // Safety: Use checked math
    let fee_amount = (total_amount.checked_mul(fee_bps).unwrap())
        .checked_div(10000)
        .unwrap();

    let user_amount = total_amount.checked_sub(fee_amount).unwrap();

    let bump = ctx.bumps.vault;                 // PDA bump seed
    let mint_key = ctx.accounts.mint.key();     // Token mint address

    // PDA Seeds for Signing (Vault will sign itself)
    let seeds = &[
        b"vault",
        mint_key.as_ref(),
        &[bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // 2a. Transfer Fee (Vault -> Fee Vault)
    if fee_amount > 0 {
        let fee_transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.fee_vault.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds
        );
        token::transfer(fee_transfer_ctx, fee_amount)?;
    }

    // 2b. Transfer Remaining Tokens (Vault -> User)
    let user_transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        token::Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.staker_token_account.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        },
        signer_seeds // These seeds are proof that the program is the owner
    );
    token::transfer(user_transfer_ctx, user_amount)?;

    // 3. Reset User Ledger (Zero out user's account)
    stake_info.amount = 0;

    // 4. Emit Event (Log)
    emit!(TokensWithdrawn {
        staker: staker.key(),
        amount: user_amount,
        fee: fee_amount,
        total_staked: 0,
    });

    msg!("Withdrawn {} tokens. Fee deducted: {}. Total Reset.", user_amount, fee_amount);
    Ok(())
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub staker: Signer<'info>, // Person requesting withdraw

    #[account(
        mut,
        seeds = [b"vault", mint.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>, // Withdraw money from Vault

    #[account(
        mut, // Modify because balance needs to be zeroed
        seeds = [b"user", staker.key().as_ref()],
        bump
    )]
    pub stake_info: Account<'info, UserStakeInfo>, // Check user's ledger

    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub staker_token_account: Account<'info, TokenAccount>, // Where money returns to user

    #[account(mut)]
    pub fee_vault: Account<'info, TokenAccount>, // Admin account where fee goes

    #[account(
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, GlobalConfig>, // Need config to know fee rate

    pub token_program: Program<'info, Token>,
}
