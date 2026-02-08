'use client';

// Polyfill Buffer for browser environment
import { Buffer } from 'buffer';
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}
if (typeof global !== 'undefined' && !global.Buffer) {
  global.Buffer = Buffer;
}

import { useMemo } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Idl, BorshCoder } from '@coral-xyz/anchor';
import IDL from '../lib/idl/staking_contract.json';

const PROGRAM_ID = new PublicKey('9vF8iR37L3nKtBR4x6mhy8dE8eMLUzcuCNbSCGCpnYHG');

export function useStakingProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = useMemo(() => {
    if (!wallet || !connection) return null;

    try {
      console.log("Initializing Program (Anchor v0.29)...");
      const provider = new AnchorProvider(connection, wallet, {
        preflightCommitment: "processed",
      });

      // Standard Anchor 0.29 initialization
      // Constructor: new Program(idl, programId, provider)
      const prog = new Program(IDL as any, PROGRAM_ID, provider);

      console.log("Program initialized successfully", prog.programId.toString());
      return prog;
    } catch (err) {
      console.error("Program init error:", err);
      return null;
    }
  }, [connection, wallet]);

  return { program, programId: PROGRAM_ID };
}
