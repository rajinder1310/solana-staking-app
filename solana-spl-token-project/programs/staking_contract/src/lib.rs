use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod state;
pub mod instructions;

use instructions::*;

// Program Unique ID. This is obtained after deployment.
declare_id!("9vF8iR37L3nKtBR4x6mhy8dE8eMLUzcuCNbSCGCpnYHG");

#[program]
pub mod staking_contract {
    use super::*;

    // Initialize Function: To create staking vault and Config.
    // Only Admin can call this.
    pub fn initialize(ctx: Context<Initialize>, initial_fee_bps: u64) -> Result<()> {
        instructions::initialize(ctx, initial_fee_bps)
    }

    // Update Fee Function: Admin can change the fee at any time.
    pub fn update_fee(ctx: Context<UpdateFee>, new_fee_bps: u64) -> Result<()> {
        instructions::update_fee(ctx, new_fee_bps)
    }

    // Deposit Function: User calls this to stake tokens.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit(ctx, amount)
    }

    // Withdraw Function: User calls this to withdraw their tokens back.
    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        instructions::withdraw(ctx)
    }
}
