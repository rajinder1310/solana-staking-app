
import { TransactionParser } from '../core/parsers/transaction';
import { ParsedTransactionWithMeta } from '@solana/web3.js';

// Mock Data
const TARGET_PROGRAM_ID = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'; // Example Program ID

const mockTx: ParsedTransactionWithMeta = {
  slot: 100,
  blockTime: 1678886400,
  transaction: {
    signatures: ['signature1'],
    message: {
      accountKeys: [],
      instructions: [
        {
          programId: TARGET_PROGRAM_ID, // Matches target
          parsed: {
            type: 'transfer',
            info: {
              source: 'A',
              destination: 'B',
              amount: '100',
            },
          },
        },
        {
          programId: 'otherProgramId', // Should be ignored
          parsed: {
            type: 'unknown',
          },
        },
      ],
      recentBlockhash: 'blockhash',
    },
  },
  meta: {
    err: null,
    fee: 5000,
    preBalances: [1000],
    postBalances: [500],
    logMessages: ['Program 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU invoke [1]', 'Program 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU success'],
    innerInstructions: [
      {
        index: 0,
        instructions: [
          {
            programId: TARGET_PROGRAM_ID, // Inner generic instruction match
            parsed: {
              type: 'mintTo',
              info: {
                mint: 'MintAddress',
                amount: '50'
              }
            }
          }
        ]
      }
    ]
  },
  version: 'legacy'
} as any; // Cast to any to bypass strict type complexity of ParsedTransactionWithMeta mock

function runTest() {
  console.log('--- Starting Manual Test for TransactionParser ---');

  try {
    const result = TransactionParser.parse('signature1', mockTx, TARGET_PROGRAM_ID);

    console.log('Parsed Result:', JSON.stringify(result, null, 2));

    // Basic Assertions
    if (result.signature !== 'signature1') throw new Error('Signature mismatch');
    if (result.slot !== 100) throw new Error('Slot mismatch');
    if (result.instructions.length !== 2) throw new Error(`Expected 2 instructions, got ${result.instructions.length}`);

    // Check first instruction (Top level)
    const topLevel = result.instructions.find(ix => !ix.inner);
    if (!topLevel || topLevel.programId !== TARGET_PROGRAM_ID) throw new Error('Top level instruction parsing failed');

    // Check second instruction (Inner)
    const innerLevel = result.instructions.find(ix => ix.inner);
    if (!innerLevel || innerLevel.programId !== TARGET_PROGRAM_ID) throw new Error('Inner instruction parsing failed');

    console.log('✅ Test Passed!');
  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
  }
}

runTest();
