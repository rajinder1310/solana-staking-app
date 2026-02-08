import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  IconButton,
  Box,
  Button,
  Link,
  useTheme,
  Fade
} from '@mui/material';
import { Close, CheckCircle, OpenInNew } from '@mui/icons-material';
import { motion } from 'framer-motion';

interface TransactionSuccessModalProps {
  open: boolean;
  onClose: () => void;
  txHash: string;
}

export function TransactionSuccessModal({ open, onClose, txHash }: TransactionSuccessModalProps) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          background: 'rgba(15, 15, 35, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 255, 163, 0.2)',
          boxShadow: '0 0 50px rgba(0, 255, 163, 0.1)',
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 4, pb: 6, pt: 0, textAlign: 'center' }}>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <Box sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'rgba(0, 255, 163, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3
          }}>
            <CheckCircle sx={{ fontSize: 48, color: '#00FFA3' }} />
          </Box>
        </motion.div>

        <Typography variant="h4" fontWeight="800" gutterBottom sx={{
          background: 'linear-gradient(45deg, #00FFA3, #03E1FF)',
          backgroundClip: 'text',
          textFillColor: 'transparent',
        }}>
          Transaction Successful!
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Your transaction has been processed on the Solana network.
        </Typography>

        <Box sx={{
          p: 2,
          bgcolor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 2,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          mb: 4,
          wordBreak: 'break-all'
        }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, textAlign: 'left' }}>
            Transaction Hash
          </Typography>
          <Typography variant="body2" fontFamily="'Roboto Mono', monospace" sx={{ color: '#00FFA3' }}>
            {txHash}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`}
            target="_blank"
            startIcon={<OpenInNew />}
            sx={{
              borderColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              '&:hover': {
                borderColor: '#00FFA3',
                bgcolor: 'rgba(0, 255, 163, 0.05)'
              }
            }}
          >
            View on Explorer
          </Button>

          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              background: 'linear-gradient(90deg, #00FFA3 0%, #03E1FF 100%)',
              color: 'black',
              fontWeight: 700,
              '&:hover': {
                boxShadow: '0 0 20px rgba(0, 255, 163, 0.4)'
              }
            }}
          >
            Done
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
