#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Transfer};

declare_id!("UY89vX8nRLbuy8LZCZy9ThMbNp1669Bi7Ue9uMwZC6P");

#[program]
pub mod token_contract {
    use super::*;

    pub fn initialize_mint(ctx: Context<InitializeMint>, decimals: u8) -> Result<()> {
        msg!("Token mint initialized: {:?}", ctx.accounts.mint.key());
        emit!(MintInitialized {
            mint: ctx.accounts.mint.key(),
            decimals,
            authority: ctx.accounts.payer.key(),
        });
        Ok(())
    }

    pub fn initialize_config(ctx: Context<InitializeConfig>, tax_basis_points: u16) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.tax_wallet = ctx.accounts.tax_wallet.key();
        config.tax_basis_points = tax_basis_points;
        config.bump = ctx.bumps.config;
        msg!("Tax config initialized with rate: {} basis points", tax_basis_points);
        Ok(())
    }

    pub fn update_config(ctx: Context<UpdateConfig>, new_tax_basis_points: u16) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.tax_basis_points = new_tax_basis_points;
        msg!("Tax config updated to: {} basis points", new_tax_basis_points);
        Ok(())
    }

    pub fn mint_token(ctx: Context<MintToken>, amount: u64) -> Result<()> {
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, amount)?;
        msg!("Minted {} tokens to {:?}", amount, ctx.accounts.token_account.key());
        emit!(TokensMinted {
            mint: ctx.accounts.mint.key(),
            to: ctx.accounts.token_account.key(),
            amount,
        });
        Ok(())
    }

    pub fn transfer_token(ctx: Context<TransferToken>, amount: u64) -> Result<()> {
        let config = &ctx.accounts.config;
        let tax_amount = (amount * config.tax_basis_points as u64) / 10000;
        let receive_amount = amount - tax_amount;

        // 1. Transfer to Recipient
        let cpi_accounts_to = Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx_to = CpiContext::new(cpi_program.clone(), cpi_accounts_to);
        token::transfer(cpi_ctx_to, receive_amount)?;

        // 2. Transfer Tax to Tax Wallet
        if tax_amount > 0 {
            let cpi_accounts_tax = Transfer {
                from: ctx.accounts.from.to_account_info(),
                to: ctx.accounts.tax_wallet.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            };
            let cpi_ctx_tax = CpiContext::new(cpi_program, cpi_accounts_tax);
            token::transfer(cpi_ctx_tax, tax_amount)?;
        }

        msg!("Transferred {} tokens (Tax: {})", receive_amount, tax_amount);
        emit!(TokensTransferred {
            from: ctx.accounts.from.key(),
            to: ctx.accounts.to.key(),
            amount,
            tax: tax_amount,
            authority: ctx.accounts.authority.key(),
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(decimals: u8)]
pub struct InitializeMint<'info> {
    #[account(
        init,
        payer = payer,
        mint::decimals = decimals,
        mint::authority = payer,
    )]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 2 + 1, // Discriminator + Pubkey + Pubkey + u16 + u8
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, TokenConfig>,
    pub tax_wallet: Account<'info, TokenAccount>, // Dedicated wallet to receive tax
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = authority,
    )]
    pub config: Account<'info, TokenConfig>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct MintToken<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct TransferToken<'info> {
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    #[account(mut)]
    pub tax_wallet: Account<'info, TokenAccount>, // Must match config.tax_wallet
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = tax_wallet,
    )]
    pub config: Account<'info, TokenConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct TokenConfig {
    pub authority: Pubkey,
    pub tax_wallet: Pubkey,
    pub tax_basis_points: u16,
    pub bump: u8,
}

#[event]
pub struct MintInitialized {
    pub mint: Pubkey,
    pub decimals: u8,
    pub authority: Pubkey,
}

#[event]
pub struct TokensMinted {
    pub mint: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
}

#[event]
pub struct TokensTransferred {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub tax: u64,
    pub authority: Pubkey,

}
