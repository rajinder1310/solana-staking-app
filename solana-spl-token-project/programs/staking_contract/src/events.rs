use anchor_lang::prelude::*;

#[event]
pub struct TokensStaked {
    pub staker: Pubkey,
    pub amount: u64,
    pub total_staked: u64,
}

#[event]
pub struct TokensWithdrawn {
    pub staker: Pubkey,
    pub amount: u64,
    pub fee: u64,
    pub total_staked: u64,
}

#[event]
pub struct FeeUpdated {
    pub old_fee: u64,
    pub new_fee: u64,
}
