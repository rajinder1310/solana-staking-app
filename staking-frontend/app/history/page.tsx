'use client';

import { Box, Container, Button, Typography, IconButton } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { TransactionHistory } from '@/components/ui/TransactionHistory';
import { Header } from '@/components/layout/Header'; // Assuming we want the same header
import { motion } from 'framer-motion';

export default function HistoryPage() {
  const router = useRouter();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 20% 50%, rgba(168, 85, 247, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.15) 0%, transparent 50%), #0A0A0F',
      }}
    >
      <Header />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/')}
            sx={{
              mb: 4,
              color: 'white',
              textTransform: 'none',
              fontSize: '1.1rem',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            Back to Dashboard
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <Box sx={{ mb: 4 }}>
            <Typography variant="h3" fontWeight="800" sx={{
              background: 'linear-gradient(45deg, #FFF, #AAA)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              mb: 1
            }}>
              Transaction History
            </Typography>
            <Typography color="text.secondary">
              View your recent deposits and withdrawals on the Solana devnet.
            </Typography>
          </Box>

          {/* Reuse the existing component but maybe wrap it to ensure it looks good full width */}
          <Box sx={{ minHeight: '600px' }}>
            <TransactionHistory />
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
}
