import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface RoundSeed {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

export interface FairnessProof {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  result: number;
  resultHash: string;
}

export class FairnessService {
  constructor(private prisma: PrismaClient) {}

  // Generate server seed for a round
  generateServerSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate client seed (can be user-provided or auto-generated)
  generateClientSeed(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  // Create hash of server seed (revealed after round completion)
  hashServerSeed(serverSeed: string): string {
    return crypto.createHash('sha256').update(serverSeed).digest('hex');
  }

  // Generate provably fair result using server seed, client seed, and nonce
  generateFairResult(serverSeed: string, clientSeed: string, nonce: number): number {
    // Combine seeds and nonce
    const combinedSeed = `${serverSeed}:${clientSeed}:${nonce}`;
    
    // Create hash
    const hash = crypto.createHash('sha256').update(combinedSeed).digest('hex');
    
    // Convert first 8 characters to number and mod 10 for result 0-9
    const hexValue = hash.substring(0, 8);
    const decimalValue = parseInt(hexValue, 16);
    
    return decimalValue % 10;
  }

  // Create round seeds and store them
  async createRoundSeeds(roundId: string): Promise<RoundSeed> {
    const serverSeed = this.generateServerSeed();
    const clientSeed = this.generateClientSeed();
    const serverSeedHash = this.hashServerSeed(serverSeed);
    
    // Store seeds in database (server seed encrypted)
    await this.prisma.gameRound.update({
      where: { id: roundId },
      data: {
        // Store encrypted seeds in a JSON field or separate table
        // For now, we'll add these as text fields to the GameRound model
      },
    });

    // Store in a separate fairness table
    await this.storeFairnessData(roundId, {
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce: 1,
    });

    return {
      serverSeed,
      clientSeed,
      nonce: 1,
    };
  }

  // Store fairness data securely
  private async storeFairnessData(roundId: string, data: {
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
  }) {
    // Encrypt server seed
    const cipher = crypto.createCipher('aes-256-cbc', process.env.FAIRNESS_SECRET || 'default-secret');
    let encryptedServerSeed = cipher.update(data.serverSeed, 'utf8', 'hex');
    encryptedServerSeed += cipher.final('hex');

    // Store in database - you might want to create a separate table for this
    // For now, we'll use a simple approach
    await this.prisma.$executeRaw`
      INSERT INTO round_fairness (round_id, server_seed_hash, client_seed, encrypted_server_seed, nonce)
      VALUES (${roundId}, ${data.serverSeedHash}, ${data.clientSeed}, ${encryptedServerSeed}, ${data.nonce})
      ON CONFLICT (round_id) DO UPDATE SET
        server_seed_hash = EXCLUDED.server_seed_hash,
        client_seed = EXCLUDED.client_seed,
        encrypted_server_seed = EXCLUDED.encrypted_server_seed,
        nonce = EXCLUDED.nonce
    `;
  }

  // Verify a completed round's fairness
  async verifyRoundFairness(roundId: string): Promise<FairnessProof | null> {
    try {
      // Get round data
      const round = await this.prisma.gameRound.findUnique({
        where: { id: roundId },
      });

      if (!round || round.winningNumber === null) {
        return null;
      }

      // Get fairness data
      const fairnessData = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM round_fairness WHERE round_id = ${roundId}
      `;

      if (!fairnessData || fairnessData.length === 0) {
        return null;
      }

      const data = fairnessData[0];

      // Decrypt server seed
      const decipher = crypto.createDecipher('aes-256-cbc', process.env.FAIRNESS_SECRET || 'default-secret');
      let serverSeed = decipher.update(data.encrypted_server_seed, 'hex', 'utf8');
      serverSeed += decipher.final('utf8');

      // Verify the result
      const calculatedResult = this.generateFairResult(serverSeed, data.client_seed, data.nonce);
      const resultHash = this.hashResult(serverSeed, data.client_seed, data.nonce, calculatedResult);

      return {
        serverSeed,
        serverSeedHash: data.server_seed_hash,
        clientSeed: data.client_seed,
        nonce: data.nonce,
        result: calculatedResult,
        resultHash,
      };
    } catch (error) {
      logger.error('Failed to verify round fairness:', error);
      return null;
    }
  }

  // Create hash of the complete result for verification
  private hashResult(serverSeed: string, clientSeed: string, nonce: number, result: number): string {
    const resultString = `${serverSeed}:${clientSeed}:${nonce}:${result}`;
    return crypto.createHash('sha256').update(resultString).digest('hex');
  }

  // Get fairness proof for display to users
  async getFairnessProof(roundId: string): Promise<{
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    resultHash: string;
    isRevealed: boolean;
  } | null> {
    try {
      const fairnessData = await this.prisma.$queryRaw<any[]>`
        SELECT server_seed_hash, client_seed, nonce FROM round_fairness WHERE round_id = ${roundId}
      `;

      if (!fairnessData || fairnessData.length === 0) {
        return null;
      }

      const data = fairnessData[0];
      const round = await this.prisma.gameRound.findUnique({
        where: { id: roundId },
        select: { status: true, winningNumber: true },
      });

      const isRevealed = round?.status === 'COMPLETED';
      let resultHash = '';

      if (isRevealed && round.winningNumber !== null) {
        // Generate result hash for completed rounds
        resultHash = crypto.createHash('sha256')
          .update(`${data.server_seed_hash}:${data.client_seed}:${data.nonce}:${round.winningNumber}`)
          .digest('hex');
      }

      return {
        serverSeedHash: data.server_seed_hash,
        clientSeed: data.client_seed,
        nonce: data.nonce,
        resultHash,
        isRevealed,
      };
    } catch (error) {
      logger.error('Failed to get fairness proof:', error);
      return null;
    }
  }

  // Initialize fairness table (run once during setup)
  async initializeFairnessTable() {
    try {
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS round_fairness (
          round_id UUID PRIMARY KEY REFERENCES game_rounds(id) ON DELETE CASCADE,
          server_seed_hash VARCHAR(64) NOT NULL,
          client_seed VARCHAR(32) NOT NULL,
          encrypted_server_seed TEXT NOT NULL,
          nonce INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      logger.info('Fairness table initialized');
    } catch (error) {
      logger.error('Failed to initialize fairness table:', error);
    }
  }
}