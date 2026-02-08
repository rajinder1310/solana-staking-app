'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, Typography, Box, Chip, CircularProgress } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

interface Transaction {
  signature: string;
  type: string;
  amount: string;
  blockTime: number;
}

export function TransactionHistory() {
  const { publicKey } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicKey) return;

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        // Fetch from indexer API
        const response = await fetch(`${process.env.NEXT_PUBLIC_INDEXER_API}/api/events?staker=${publicKey.toString()}`);
        const data = await response.json();
        setTransactions(data.slice(0, 10)); // Latest 10
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [publicKey]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="primary" />
          Transaction History
        </Typography>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : transactions.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No transactions yet
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {transactions.map((tx) => (
              <Box
                key={tx.signature}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: 2,
                  background: 'rgba(153, 69, 255, 0.05)',
                  '&:hover': {
                    background: 'rgba(153, 69, 255, 0.1)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {tx.type === 'deposit' ? (
                    <ArrowUpwardIcon color="success" />
                  ) : (
                    <ArrowDownwardIcon color="error" />
                  )}
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {tx.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {(Number(tx.amount) / 1_000_000_000).toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(tx.blockTime * 1000).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
