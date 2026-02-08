use anchor_lang::prelude::*;

#[account]
pub struct GlobalConfig {
    pub admin: Pubkey,       // Who is Admin
    pub withdraw_fee_bps: u64, // Current Fee (Basis Points)
}
