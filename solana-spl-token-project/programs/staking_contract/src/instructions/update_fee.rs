use anchor_lang::prelude::*;
use crate::state::*;
use crate::events::FeeUpdated;

pub fn update_fee(ctx: Context<UpdateFee>, new_fee_bps: u64) -> Result<()> {
    let config = &mut ctx.accounts.config;

    // Validation: Admin check happens in the struct (has_one = admin)

    let old_fee = config.withdraw_fee_bps;
    config.withdraw_fee_bps = new_fee_bps;

    emit!(FeeUpdated {
        old_fee,
        new_fee: new_fee_bps
    });

    msg!("Fee updated from {} to {}", old_fee, new_fee_bps);
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateFee<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump,
        has_one = admin, // Confirm signer is admin
    )]
    pub config: Account<'info, GlobalConfig>,

    pub admin: Signer<'info>, // Only admin can call
}
