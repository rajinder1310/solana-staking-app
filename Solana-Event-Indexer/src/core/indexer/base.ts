
import { ProgramDefinition } from '../../config/programs';
import { logger } from '../../utils/logger';
import { IndexerRepository } from '../../db/repository';

export abstract class BaseIndexer {
  protected program: ProgramDefinition;
  protected isRunning: boolean = false;
  protected repository: IndexerRepository;

  constructor(program: ProgramDefinition) {
    this.program = program;
    this.repository = new IndexerRepository();
  }

  abstract start(): Promise<void>;

  stop(): void {
    this.isRunning = false;
    logger.info(`[${this.program.name}] 🛑 Stopping indexer...`);
  }
}
