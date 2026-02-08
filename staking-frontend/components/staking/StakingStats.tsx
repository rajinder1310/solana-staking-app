'use client';

import { Card, CardContent, Typography, Grid, Box } from '@mui/material';
import { useWallet } from '@solana/wallet-adapter-react';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TimelineIcon from '@mui/icons-material/Timeline';

export function StakingStats() {
  const { connected } = useWallet();

  // Mock data matching Dashboard
  const apy = 12.5;
  const totalStaked = 125000;
  const stakers = 154;

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} md={4}>
        <Card sx={{ background: 'linear-gradient(135deg, rgba(0, 255, 163, 0.1), rgba(0, 255, 163, 0.05))', border: '1px solid #00FFA330' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Total Value Locked
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {totalStaked.toLocaleString()} TOKENS
                </Typography>
              </Box>
              <TimelineIcon sx={{ fontSize: 40, color: '#00FFA3' }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={{ background: 'linear-gradient(135deg, rgba(3, 225, 255, 0.1), rgba(3, 225, 255, 0.05))', border: '1px solid #03E1FF30' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  APY
                </Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ color: '#00FFA3' }}>
                  {apy}%
                </Typography>
              </Box>
              <TrendingUpIcon sx={{ fontSize: 40, color: '#03E1FF' }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 215, 0, 0.05))', border: '1px solid #FFD70030' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom>
                  Total Stakers
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {stakers}
                </Typography>
              </Box>
              <AccountBalanceWalletIcon sx={{ fontSize: 40, color: '#FFD700' }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
