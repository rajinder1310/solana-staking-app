'use client';

import { Box, CircularProgress, keyframes } from '@mui/material';

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.95);
  }
`;

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const gradientShift = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

interface LoaderProps {
  size?: number;
  fullScreen?: boolean;
  message?: string;
}

export function PremiumLoader({ size = 60, fullScreen = false, message }: LoaderProps) {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        ...(fullScreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 15, 35, 0.95)',
          backdropFilter: 'blur(10px)',
          zIndex: 9999,
        }),
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: size,
          height: size,
        }}
      >
        {/* Outer rotating gradient ring */}
        <Box
          sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'linear-gradient(90deg, #9945FF, #14F195, #9945FF)',
            backgroundSize: '200% 200%',
            animation: `${rotate} 2s linear infinite, ${gradientShift} 3s ease infinite`,
            padding: '3px',
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: '#0F0F23',
            }}
          />
        </Box>

        {/* Inner pulsing circle */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60%',
            height: '60%',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #9945FF, #14F195)',
            animation: `${pulse} 2s ease-in-out infinite`,
            boxShadow: '0 0 30px rgba(153, 69, 255, 0.6)',
          }}
        />
      </Box>

      {message && (
        <Box
          sx={{
            color: 'text.primary',
            fontSize: '1rem',
            fontWeight: 500,
            animation: `${pulse} 2s ease-in-out infinite`,
          }}
        >
          {message}
        </Box>
      )}
    </Box>
  );

  return content;
}

export function InlineLoader({ size = 20 }: { size?: number }) {
  return (
    <CircularProgress
      size={size}
      sx={{
        color: 'primary.main',
        '& .MuiCircularProgress-circle': {
          strokeLinecap: 'round',
        },
      }}
    />
  );
}
