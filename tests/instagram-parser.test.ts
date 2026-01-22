import { describe, it, expect } from 'vitest';
import { InstagramMessageParser } from '../src/services/instagram-message-parser';

describe('InstagramMessageParser', () => {
  const parser = new InstagramMessageParser();

  it('deve parsear um webhook válido do Instagram', () => {
    const validWebhook = {
      object: 'instagram',
      entry: [
        {
          id: '123456',
          time: 1234567890,
          messaging: [
            {
              sender: { id: 'sender123' },
              recipient: { id: 'recipient456' },
              timestamp: 1234567890000,
              message: {
                mid: 'msg123',
                text: 'Olá, quero saber sobre o Forefy',
              },
            },
          ],
        },
      ],
    };

    const result = parser.parse(validWebhook);

    expect(result).not.toBeNull();
    expect(result?.contatoId).toBe('sender123');
    expect(result?.contaId).toBe('recipient456');
    expect(result?.contatoMsg).toBe('Olá, quero saber sobre o Forefy');
    expect(result?.messageId).toBe('msg123');
  });

  it('deve retornar null para webhook sem texto', () => {
    const webhookSemTexto = {
      object: 'instagram',
      entry: [
        {
          id: '123456',
          time: 1234567890,
          messaging: [
            {
              sender: { id: 'sender123' },
              recipient: { id: 'recipient456' },
              timestamp: 1234567890000,
              message: {
                mid: 'msg123',
                // sem texto
              },
            },
          ],
        },
      ],
    };

    const result = parser.parse(webhookSemTexto);
    expect(result).toBeNull();
  });

  it('deve retornar null para webhook inválido', () => {
    const webhookInvalido = {
      object: 'facebook', // não é instagram
      entry: [],
    };

    const result = parser.parse(webhookInvalido);
    expect(result).toBeNull();
  });

  it('deve validar webhook corretamente', () => {
    const validWebhook = {
      object: 'instagram',
      entry: [
        {
          id: '123456',
          time: 1234567890,
          messaging: [
            {
              sender: { id: 'sender123' },
              recipient: { id: 'recipient456' },
              timestamp: 1234567890000,
              message: {
                mid: 'msg123',
                text: 'Teste',
              },
            },
          ],
        },
      ],
    };

    expect(parser.isValidWebhook(validWebhook)).toBe(true);
  });

  it('deve invalidar webhook incorreto', () => {
    const invalidWebhook = {
      object: 'invalid',
      entry: [],
    };

    expect(parser.isValidWebhook(invalidWebhook)).toBe(false);
  });
});
