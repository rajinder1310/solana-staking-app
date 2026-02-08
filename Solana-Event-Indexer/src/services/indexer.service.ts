
import { programs } from '../config/programs';
import { HistoricalIndexer } from '../core/indexer/historical';
import { RealtimeIndexer } from '../core/indexer/realtime';
import { logger } from '../utils/logger';

export class IndexerService {
  private indexers: (HistoricalIndexer | RealtimeIndexer)[] = [];

  constructor() {
    // Initialize indexers for each program config
    for (const program of programs) {
      if (program.historical) {
        this.indexers.push(new HistoricalIndexer(program));
      }
      if (program.realtime) {
        this.indexers.push(new RealtimeIndexer(program));
      }
    }
  }

  async start() {
    logger.info(`🚀 Starting Indexer Service for ${programs.length} programs...`);

    // Start all indexers concurrently
    await Promise.all(this.indexers.map(indexer => indexer.start()));

    logger.info(`✅ All indexers started.`);
  }

  stop() {
    logger.info('🛑 Stopping all indexers...');
    this.indexers.forEach(indexer => indexer.stop());
  }
}
