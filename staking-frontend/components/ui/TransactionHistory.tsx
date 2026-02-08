import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Link,
  CircularProgress,
  TablePagination
} from '@mui/material';
import { OpenInNew, Refresh, History as HistoryIcon, ArrowForward, ArrowBack } from '@mui/icons-material';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';

interface TxHistoryItem {
  signature: string;
  blockTime: number;
  type: string;
  amount: string;
  status: string;
}

export function TransactionHistory() {
  const { publicKey } = useWallet();
  const [history, setHistory] = useState<TxHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const fetchHistory = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      // API page is 1-based, MUI page is 0-based
      const res = await fetch(`http://localhost:3001/history?address=${publicKey.toBase58()}&page=${page + 1}&limit=${rowsPerPage}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
        setTotalCount(data.pagination.total);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (publicKey) {
      fetchHistory();
    } else {
      setHistory([]);
    }
  }, [publicKey, page, rowsPerPage]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (!publicKey) return null;

  return (
    <Paper sx={{
      borderRadius: 4,
      background: 'rgba(15, 15, 35, 0.4)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <Box sx={{
        p: 3,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            p: 1,
            borderRadius: '12px',
            background: 'rgba(124, 58, 237, 0.15)',
            color: '#a78bfa',
            display: 'flex'
          }}>
            <HistoryIcon fontSize="small" />
          </Box>
          <Typography variant="h6" fontWeight="700" sx={{ letterSpacing: '-0.5px' }}>
            Transaction History
          </Typography>
        </Box>
        <IconButton
          onClick={fetchHistory}
          disabled={loading}
          size="small"
          sx={{
            bgcolor: 'rgba(255,255,255,0.05)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
          }}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : <Refresh fontSize="small" />}
        </IconButton>
      </Box>

      {/* Table */}
      <TableContainer sx={{
        flexGrow: 1,
        overflow: 'auto',
        '&::-webkit-scrollbar': { width: '6px' },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }
      }}>
        <Table stickyHeader size="medium">
          <TableHead>
            <TableRow>
              {['Type', 'Amount', 'Time', 'Link'].map((head) => (
                <TableCell key={head} sx={{
                  bgcolor: '#0A0A0F', // Solid background for sticky header
                  color: 'text.secondary',
                  fontWeight: 600,
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  py: 2
                }}>
                  {head}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && history.length === 0 ? (
              <TableRow><TableCell colSpan={4} align='center' sx={{ py: 8 }}><CircularProgress /></TableCell></TableRow>
            ) : history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 8, border: 'none', color: 'text.secondary' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <HistoryIcon sx={{ fontSize: 48, opacity: 0.2 }} />
                    <Typography>No transactions found</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              history.map((tx, index) => (
                <TableRow
                  key={tx.signature}
                  component={motion.tr}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  sx={{
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                    cursor: 'default'
                  }}
                >
                  <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <Chip
                      label={tx.type.toUpperCase()}
                      size="small"
                      sx={{
                        height: 24,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        bgcolor: tx.type === 'deposit' ? 'rgba(0, 255, 163, 0.1)' : 'rgba(3, 225, 255, 0.1)',
                        color: tx.type === 'deposit' ? '#00FFA3' : '#03E1FF',
                        border: '1px solid',
                        borderColor: tx.type === 'deposit' ? 'rgba(0, 255, 163, 0.2)' : 'rgba(3, 225, 255, 0.2)'
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontWeight: 600, fontSize: '1rem' }}>
                    {tx.amount ? (parseFloat(tx.amount) / 1_000_000_000).toFixed(2) : '-'} <Typography component="span" fontSize="0.75rem" color="text.secondary">SOL</Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: 'text.secondary' }}>
                    {new Date(tx.blockTime * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <Link
                      href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                      target="_blank"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        color: 'text.secondary',
                        textDecoration: 'none',
                        transition: 'color 0.2s',
                        '&:hover': { color: '#fff' }
                      }}
                    >
                      <Typography variant="caption">View</Typography>
                      <OpenInNew sx={{ fontSize: 14 }} />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Controls */}
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          color: 'text.secondary',
          '.MuiTablePagination-select': { color: 'white' },
          '.MuiTablePagination-selectIcon': { color: 'rgba(255,255,255,0.5)' }
        }}
      />
    </Paper>
  );
}
