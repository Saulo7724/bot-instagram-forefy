import { BufferWindowMemory } from 'langchain/memory';
import { ChatMessageHistory } from 'langchain/stores/message/in_memory';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Gerenciador de memória de conversas
 * Implementa Window Buffer Memory para manter contexto de 10 mensagens por usuário
 */
export class MemoryManagerService {
  private memories: Map<string, BufferWindowMemory>;

  constructor() {
    this.memories = new Map();
  }

  /**
   * Obtém ou cria memória para um usuário específico
   */
  getMemory(userId: string): BufferWindowMemory {
    if (!this.memories.has(userId)) {
      logger.debug('Criando nova memória para usuário', { userId });

      const memory = new BufferWindowMemory({
        k: config.agent.contextWindowLength, // 10 mensagens
        returnMessages: true,
        memoryKey: 'chat_history',
        inputKey: 'input',
        outputKey: 'output',
        chatHistory: new ChatMessageHistory(),
      });

      this.memories.set(userId, memory);
    }

    return this.memories.get(userId)!;
  }

  /**
   * Limpa a memória de um usuário
   */
  async clearMemory(userId: string): Promise<void> {
    const memory = this.memories.get(userId);
    if (memory) {
      await memory.clear();
      logger.info('Memória limpa', { userId });
    }
  }

  /**
   * Remove memória de um usuário (libera da memória)
   */
  removeMemory(userId: string): void {
    if (this.memories.has(userId)) {
      this.memories.delete(userId);
      logger.info('Memória removida', { userId });
    }
  }

  /**
   * Retorna o número de usuários com memória ativa
   */
  getActiveUsersCount(): number {
    return this.memories.size;
  }

  /**
   * Limpa memórias antigas (usuários inativos)
   */
  async cleanupInactiveMemories(inactiveThresholdMs: number = 3600000): Promise<void> {
    // Por enquanto, limpeza básica. Pode ser expandido com timestamps
    logger.info('Limpeza de memórias não implementada ainda', {
      threshold: inactiveThresholdMs,
    });
  }
}
