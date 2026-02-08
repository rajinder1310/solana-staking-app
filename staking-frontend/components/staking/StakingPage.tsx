import { Box, Container, Typography } from '@mui/material';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Header } from '@/components/layout/Header';
import StakingDashboard from '@/components/staking/StakingDashboard';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

export default function StakingPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 20% 50%, rgba(168, 85, 247, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.15) 0%, transparent 50%), #0A0A0F',
      }}
    >
      <Header />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
            <RocketLaunchIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' } }}>
              Solana Staking
            </Typography>
          </Box>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
            Stake your tokens and earn rewards on the fastest blockchain
          </Typography>
        </Box>

        <StakingDashboard />
      </Container>
    </Box>
  );
}
