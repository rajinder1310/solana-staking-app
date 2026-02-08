/**
 * Configuration for a single Solana program to index
 */
export interface ProgramConfig {
  /** Solana program address (public key) */
  programId: string;

  /** User-friendly name for the program */
  name: string;

  /** Solana RPC endpoint URL */
  rpcUrl: string;

  /** Slot number to start indexing from */
  startSlot: number;

  /** Maximum number of signatures to fetch per request (default: 1000, max: 1000) */
  maxSignaturesPerRequest?: number;
}

/**
 * Global indexer configuration
 */
export interface IndexerConfig {
  /** MongoDB connection URI */
  mongoUri: string;

  /** Array of Solana programs to index */
  programs: ProgramConfig[];
}

/**
 * Parsed Solana transaction data
 */
export interface SolanaTransaction {
  programId: string;
  signature: string;
  slot: number;
  blockTime: number | null;
  instructions: any[];
  logs: string[] | null;
  createdAt: Date;
}
