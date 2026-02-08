use anchor_lang::prelude::*;

#[account]
pub struct UserStakeInfo {
    pub amount: u64,        // Amount deposited (8 bytes)
    pub deposit_ts: i64,    // Deposited at (Timestamp) (8 bytes)
}
