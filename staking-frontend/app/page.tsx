'use client';

import { Box } from '@mui/material';
import dynamic from 'next/dynamic';

const StakingPage = dynamic(
  () => import('@/components/staking/StakingPage'),
  { ssr: false }
);

export default function Home() {
  return (
    <Box sx={{ minHeight: '100vh', background: '#0A0A0F' }}>
      <StakingPage />
    </Box>
  );
}
