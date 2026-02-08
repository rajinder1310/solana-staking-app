'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Fade,
  useTheme,
  Card,
  CardContent,
  Avatar,
  Stack,
  IconButton,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Timeline,
  AccountBalanceWallet,
  Refresh,
  Info,
  ArrowUpward,
  ArrowDownward,
  AccountBalance
} from '@mui/icons-material';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { useStakingProgram } from '../../hooks/useStakingProgram';
import { motion } from 'framer-motion';
import { PremiumLoader } from '../ui/PremiumLoader';
import { TransactionSuccessModal } from '../ui/TransactionSuccessModal';
import { useRouter } from 'next/navigation';
import { History as HistoryIcon } from '@mui/icons-material';

// Mock data constants
const MOCK_APY = 12.5; // 12.5% APY
const MOCK_TOKEN_PRICE = 1.45; // $1.45 per token
const INITIAL_BALANCE = 1000.10;

// Token Mint (User must have this configured in env, falling back to a hardcoded one if needed for demo)
const TOKEN_MINT = new PublicKey(process.env.NEXT_PUBLIC_TOKEN_MINT || '2hSMP1YD9zzJG4jr8gxB4Xkond77jdQnP7uqHcp9wZLa');

export default function StakingDashboard() {
  const { connection } = useConnection();
  const { connected, publicKey } = useWallet();
  const { program, programId } = useStakingProgram();
  const router = useRouter();

  // UI State
  const [stakedAmount, setStakedAmount] = useState<string>('0');
  const [rewardAmount, setRewardAmount] = useState<string>('0');
  const [balance, setBalance] = useState<string>('0');
  const [amount, setAmount] = useState('');
  const [platformFee, setPlatformFee] = useState<string>('Loading...');

  // Loading & Notification State
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Helper to fetch User Token Balance
  const fetchBalance = async (key: PublicKey | null) => {
    if (!connected || !key) {
      setBalance('0');
      return;
    }

    try {
      const userAta = await getAssociatedTokenAddress(TOKEN_MINT, key);
      const accountInfo = await connection.getAccountInfo(userAta);

      if (accountInfo) {
        const tokenBalance = await connection.getTokenAccountBalance(userAta);
        setBalance(tokenBalance.value.uiAmountString || '0');
      } else {
        setBalance('0'); // No ATA means 0 balance
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err);
      // Don't show error to user, just 0
      setBalance('0');
    }
  };

  // Helper to fetch Staked Balance from Contract
  const fetchStakedBalance = async (key: PublicKey | null) => {
    if (!program || !key) return;

    try {
      const [stakeInfoPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('user'), key.toBuffer()],
        programId
      );

      // Check if account exists first to avoid error spam
      const info = await connection.getAccountInfo(stakeInfoPda);
      if (info) {
        const account = await (program.account as any).userStakeInfo.fetch(stakeInfoPda);
        // amount is a BN (u64) - 9 decimals assumption
        const amount = account.amount.toNumber() / 1_000_000_000;
        setStakedAmount(amount.toFixed(2));
      } else {
        setStakedAmount('0');
      }
    } catch (err) {
      console.error("Failed to fetch staked info:", err);
      // It's possible account doesn't exist yet, so 0 is fine default
      setStakedAmount('0');
    }
  };

  // Initial Data Fetch & Auto-Refresh on Wallet Change
  useEffect(() => {
    if (connected && publicKey) {
      // Clear previous state first to avoid stale data
      setBalance('0');
      setStakedAmount('0');
      setPlatformFee('Loading...');

      // Fetch new data using specific publicKey from this effect iteration
      fetchBalance(publicKey);
      fetchStakedBalance(publicKey);
    } else {
      // Reset if disconnected
      setBalance('0');
      setStakedAmount('0');
    }
  }, [connected, publicKey, connection, program]);

  // Fetch Platform Fee from Contract
  useEffect(() => {
    if (!program || !programId) return;

    const fetchFee = async () => {
      try {
        const [configPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('config')],
          programId
        );

        const configAccount = await (program.account as any).globalConfig.fetch(configPda);
        const feeBps = (configAccount as any).withdrawFeeBps.toNumber();
        const feePercent = feeBps / 100;

        setPlatformFee(`${feePercent}%`);

      } catch (err) {
        console.error("Failed to fetch fee:", err);
        setPlatformFee("Unknown"); // Fallback
      }
    };

    fetchFee();
  }, [program, programId]);

  // Real Transaction: Deposit
  const handleDeposit = async () => {
    if (!connected || !publicKey) {
      setError("Please connect your wallet first");
      return;
    }

    if (!program || !programId) {
      setError("Program not initialized. Checks logs or refresh.");
      return;
    }

    const numVal = parseFloat(amount);
    if (!numVal || numVal <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const depositAmount = new anchor.BN(numVal * 1_000_000_000); // 9 decimal assumption

      // Derive PDAs
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), TOKEN_MINT.toBuffer()],
        programId
      );
      const [stakeInfoPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('user'), publicKey.toBuffer()],
        programId
      );

      const userAta = await getAssociatedTokenAddress(TOKEN_MINT, publicKey);

      console.log("Staking...");

      const tx = await program.methods
        .deposit(depositAmount)
        .accounts({
          staker: publicKey,
          vault: vaultPda,
          stakeInfo: stakeInfoPda,
          mint: TOKEN_MINT,
          stakerTokenAccount: userAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      console.log("Tx signature:", tx);
      setTxHash(tx);
      setShowSuccessModal(true);
      setAmount('');

      // Refresh data
      fetchBalance();
      fetchStakedBalance();

    } catch (err: any) {
      console.error("Deposit error:", err);
      // Nice error message
      let msg = err.message;
      if (err.message.includes("User rejected")) msg = "Transaction rejected by wallet";
      setError(msg || "Deposit failed");
    } finally {
      setLoading(false);
    }
  };

  // Real Transaction: Withdraw
  const handleWithdraw = async () => {
    if (!connected || !publicKey) {
      setError("Please connect your wallet first");
      return;
    }

    if (!program || !programId) {
      setError("Program not initialized. Checks logs or refresh.");
      return;
    }

    // Check if there is anything to withdraw
    if (parseFloat(stakedAmount) <= 0) {
      setError("No tokens staked");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Derive PDAs
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), TOKEN_MINT.toBuffer()],
        programId
      );
      const [stakeInfoPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('user'), publicKey.toBuffer()],
        programId
      );
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        programId
      );

      // Fetch Config to get Admin for Fee Vault
      const configAccount = await (program.account as any).globalConfig.fetch(configPda);
      const adminPubkey = configAccount.admin as PublicKey;

      // Admin's ATA is the Fee Vault
      const feeVaultAtA = await getAssociatedTokenAddress(TOKEN_MINT, adminPubkey);
      const userAta = await getAssociatedTokenAddress(TOKEN_MINT, publicKey);

      console.log("Withdrawing...");

      const tx = await program.methods
        .withdraw()
        .accounts({
          staker: publicKey,
          vault: vaultPda,
          stakeInfo: stakeInfoPda,
          mint: TOKEN_MINT,
          stakerTokenAccount: userAta,
          feeVault: feeVaultAtA, // Admin's ATA
          config: configPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .rpc();

      console.log("Tx signature:", tx);
      setTxHash(tx);
      setShowSuccessModal(true);


      // Refresh data
      fetchBalance();
      fetchStakedBalance();

    } catch (err: any) {
      console.error("Withdraw error:", err);
      let msg = err.message;
      if (err.message.includes("User rejected")) msg = "Transaction rejected by wallet";
      setError(msg || "Withdraw failed");
    } finally {
      setLoading(false);
    }
  };



  // Simulate rewards generating over time
  useEffect(() => {
    if (parseFloat(stakedAmount) > 0) {
      const interval = setInterval(() => {
        setRewardAmount(prev => (parseFloat(prev) + 0.0001).toFixed(6));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [stakedAmount]);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5
      }
    }),
    hover: {
      y: -5,
      transition: { duration: 0.2 }
    }
  };

  return (
    <Container maxWidth={false} sx={{ py: 2, px: { xs: 2, md: 6 }, maxWidth: '1600px', mx: 'auto', userSelect: 'none' }}>
      {loading && <PremiumLoader fullScreen message="Transaction is in progress..." />}
      <TransactionSuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        txHash={txHash}
      />

      {/* Header & Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          {/* Optional: Add a title if needed, or keep it clean as requested */}
        </Box>
        <Button
          startIcon={<HistoryIcon />}
          onClick={() => router.push('/history')}
          sx={{
            color: 'white',
            borderColor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            background: 'rgba(255,255,255,0.05)',
            px: 2,
            py: 0.8,
            borderRadius: '12px',
            textTransform: 'none',
            fontSize: '0.9rem',
            '&:hover': {
              background: 'rgba(255,255,255,0.1)',
              borderColor: '#00FFA3',
              boxShadow: '0 0 15px rgba(0, 255, 163, 0.3)'
            }
          }}
          variant="outlined"
        >
          View History
        </Button>
      </Box>

      {/* Stats Cards Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          {
            title: 'Staked Balance',
            value: stakedAmount,
            icon: <Timeline sx={{ fontSize: { xs: 24, md: 32 } }} />,
            subtext: `${MOCK_APY}% APY`,
            color: 'linear-gradient(135deg, rgba(0, 255, 163, 0.15), rgba(0, 255, 163, 0.05))',
            borderColor: '#00FFA3',
            textColor: '#00FFA3'
          },
          {
            title: 'Available Balance',
            value: balance,
            icon: <AccountBalanceWallet sx={{ fontSize: { xs: 24, md: 32 } }} />,
            subtext: 'Tokens',
            color: 'linear-gradient(135deg, rgba(3, 225, 255, 0.15), rgba(3, 225, 255, 0.05))',
            borderColor: '#03E1FF',
            textColor: '#03E1FF'
          },
          {
            title: 'Platform Fee',
            value: platformFee,
            icon: <Info sx={{ fontSize: { xs: 24, md: 32 } }} />,
            subtext: 'Withdrawal Fee',
            color: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 215, 0, 0.05))',
            borderColor: '#FFD700',
            textColor: '#FFD700'
          }
        ].map((stat, index) => (
          <Grid item xs={12} md={4} key={stat.title}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <Paper sx={{
                p: 3,
                borderRadius: '12px',
                background: stat.color,
                backdropFilter: 'blur(30px)',
                border: `1px solid ${stat.borderColor}30`,
                boxShadow: `0 8px 32px 0 ${stat.borderColor}15`,
                position: 'relative',
                overflow: 'hidden',
              }}>
                <Box sx={{ zIndex: 1, position: 'relative' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight="600" sx={{ letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                      {stat.title}
                    </Typography>
                    <Box sx={{ color: stat.textColor }}>{stat.icon}</Box>
                  </Box>
                  <Typography variant="h4" fontWeight="800" sx={{ mb: 1, letterSpacing: '-1px' }}>
                    {stat.value}
                  </Typography>
                  <Chip
                    label={stat.subtext}
                    sx={{
                      bgcolor: `${stat.borderColor}20`,
                      color: stat.textColor,
                      fontWeight: 700,
                      borderRadius: '6px',
                      height: 24,
                      fontSize: '0.75rem'
                    }}
                  />
                </Box>
                {/* Decorative Glow */}
                <Box sx={{
                  position: 'absolute',
                  top: '-50%',
                  right: '-20%',
                  width: '150px',
                  height: '150px',
                  background: stat.borderColor,
                  filter: 'blur(80px)',
                  opacity: 0.15,
                  borderRadius: '50%'
                }} />
              </Paper>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Main Action Panels: Deposit & Withdraw */}
      {/* Container is full width here */}
      <Grid container spacing={3} alignItems="stretch">

        {/* Deposit Panel */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            style={{ height: '100%' }}
          >
            <Paper sx={{
              p: 4,
              borderRadius: '12px',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              background: 'linear-gradient(160deg, rgba(124, 58, 237, 0.08) 0%, rgba(15, 15, 30, 0.6) 100%)',
              backdropFilter: 'blur(40px)',
              boxShadow: '0 20px 80px rgba(124, 58, 237, 0.1)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative Background Blob */}
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #7C3AED 0%, #C084FC 100%)',
                boxShadow: '0 0 15px #7C3AED'
              }} />

              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                <Avatar sx={{
                  bgcolor: 'rgba(124, 58, 237, 0.2)',
                  color: '#C084FC',
                  width: 48,
                  height: 48
                }}>
                  <ArrowUpward />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="700" sx={{ letterSpacing: '-0.5px' }}>Deposit</Typography>
                  <Typography variant="body2" color="text.secondary">Stake your tokens to earn rewards</Typography>
                </Box>
              </Stack>

              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <TextField
                    fullWidth
                    placeholder="0.00"
                    variant="outlined"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    type="number"
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        fontSize: { xs: '1.4rem', md: '1.8rem' },
                        fontWeight: '600',
                        bgcolor: 'rgba(0,0,0,0.2)',
                        borderRadius: '12px',
                        height: { xs: '60px', md: '70px' },
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                        '&:hover fieldset': { borderColor: 'rgba(124, 58, 237, 0.5)' },
                        '&.Mui-focused fieldset': { borderColor: '#7C3AED', borderWidth: 2 }
                      }
                    }}
                    InputProps={{
                      endAdornment: (
                        <Typography color="text.secondary" fontWeight="600" sx={{ ml: 2, fontSize: '1rem' }}>TOKENS</Typography>
                      )
                    }}
                  />
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleDeposit}
                  disabled={loading || !connected}
                  sx={{
                    py: { xs: 1.5, md: 1.8 },
                    borderRadius: '12px',
                    background: 'linear-gradient(90deg, #7C3AED 0%, #C084FC 100%)',
                    fontSize: { xs: '1rem', md: '1.1rem' },
                    fontWeight: 800,
                    textTransform: 'none',
                    letterSpacing: '0.5px',
                    boxShadow: '0 10px 40px rgba(124, 58, 237, 0.3)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 15px 50px rgba(124, 58, 237, 0.5)'
                    }
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Confirm Deposit'}
                </Button>
              </Box>
            </Paper>
          </motion.div>
        </Grid>

        {/* Withdraw Panel */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            style={{ height: '100%' }}
          >
            <Paper sx={{
              p: 4,
              borderRadius: '12px',
              border: '1px solid rgba(0, 255, 163, 0.2)',
              background: 'linear-gradient(160deg, rgba(0, 255, 163, 0.05) 0%, rgba(15, 15, 30, 0.6) 100%)',
              backdropFilter: 'blur(40px)',
              boxShadow: '0 20px 80px rgba(0, 255, 163, 0.1)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative Background Blob */}
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #00FFA3 0%, #03E1FF 100%)',
                boxShadow: '0 0 15px #00FFA3'
              }} />

              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                <Avatar sx={{
                  bgcolor: 'rgba(0, 255, 163, 0.15)',
                  color: '#00FFA3',
                  width: 48,
                  height: 48
                }}>
                  <ArrowDownward />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="700" sx={{ letterSpacing: '-0.5px' }}>Withdraw</Typography>
                  <Typography variant="body2" color="text.secondary">Claim your principal and rewards</Typography>
                </Box>
              </Stack>

              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Paper variant="outlined" sx={{
                  p: 3,
                  mb: 3,
                  bgcolor: 'rgba(0,0,0,0.3)',
                  borderColor: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
                    Currently Staked
                  </Typography>
                  <Typography variant="h3" fontWeight="800" sx={{ color: '#00FFA3', letterSpacing: '-1px' }}>
                    {stakedAmount}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.5, mt: 0.5 }}>TOKENS</Typography>
                </Paper>

                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  onClick={handleWithdraw}
                  disabled={loading || !connected}
                  sx={{
                    py: { xs: 1.5, md: 1.8 },
                    borderRadius: '12px',
                    border: '2px solid rgba(0, 255, 163, 0.3)',
                    color: '#00FFA3',
                    fontSize: { xs: '1rem', md: '1.rem' },
                    fontWeight: 800,
                    textTransform: 'none',
                    letterSpacing: '0.5px',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: 'rgba(0, 255, 163, 0.1)',
                      borderColor: '#00FFA3',
                      boxShadow: '0 0 30px rgba(0, 255, 163, 0.3)',
                      transform: 'translateY(-2px)',
                    }
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Withdraw All & Claim'}
                </Button>
              </Box>
            </Paper>
          </motion.div>
        </Grid>

      </Grid>
    </Container>
  );
}
