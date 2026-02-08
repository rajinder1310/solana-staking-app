/**
 * Program definitions for the Solana Event Indexer.
 * Each program represents a smart contract that the indexer can monitor.
 */
export interface ProgramDefinition {
  /** Program ID (public key) */
  id: string;
  /** Human‑readable name */
  name: string;
  /** Optional description of the program */
  description?: string;
  /** Slot at which indexing should start (0 = from genesis) */
  startSlot?: number;
  /** Whether realtime (WebSocket) indexing is enabled */
  realtime: boolean;
  /** Whether historical (polling) indexing is enabled */
  historical: boolean;
}

/**
 * List of programs to index.
 * Commented entries are kept as examples for future use.
 */
export const programs: ProgramDefinition[] = [
  // Example program definitions:
  // {
  //   id: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  //   name: 'token-program',
  //   description: 'Solana Token Program',
  //   startSlot: 0,
  //   realtime: true,
  //   historical: true,
  // },
  // {
  //   id: 'So11111111111111111111111111111111111111111',
  //   name: 'wrapped-sol',
  //   description: 'Wrapped SOL Mint',
  //   startSlot: 0, // Will auto‑resume from DB or start fresh
  //   realtime: true,
  //   historical: true,
  // },

  {
    id: '9vF8iR37L3nKtBR4x6mhy8dE8eMLUzcuCNbSCGCpnYHG', // Correct Deployed Contract
    name: 'user-contract',
    description: 'User Provided Contract',
    startSlot: 0,
    realtime: true,
    historical: true,
  },
];
