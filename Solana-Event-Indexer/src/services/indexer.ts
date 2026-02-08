
import { IndexerConfig } from '../types';
import { ProgramIndexer } from './ProgramIndexer';

/**
 * IndexerService - Manages multiple ProgramIndexer instances
 *
 * Runs one indexer per configured Solana program concurrently
 */
export class IndexerService {
  private indexers: ProgramIndexer[] = [];
  private config: IndexerConfig;

  constructor(config: IndexerConfig) {
    this.config = config;
  }

  /**
   * Initialize and start all program indexers
   */
  public async start() {
    console.log('\n🚀 Starting Indexer Service...\n');

    // Create indexer instance for each configured program
    for (const programConfig of this.config.programs) {
      const indexer = new ProgramIndexer(programConfig);
      this.indexers.push(indexer);

      // Start indexer (runs in background loop)
      indexer.start();
    }

    console.log(`\n✅ Started ${this.indexers.length} program indexer(s)\n`);
  }

  /**
   * Stop all running indexers
   */
  public stop() {
    console.log('\n🛑 Stopping all indexers...\n');

    for (const indexer of this.indexers) {
      indexer.stop();
    }

    this.indexers = [];
    console.log('✅ All indexers stopped\n');
  }
}
