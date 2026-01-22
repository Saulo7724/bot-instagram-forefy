import { z } from 'zod';

/**
 * Schema para validação do webhook do Instagram
 */
export const InstagramWebhookSchema = z.object({
  object: z.literal('instagram'),
  entry: z.array(
    z.object({
      id: z.string(),
      time: z.number(),
      messaging: z.array(
        z.object({
          sender: z.object({
            id: z.string(),
          }),
          recipient: z.object({
            id: z.string(),
          }),
          timestamp: z.number(),
          message: z.object({
            mid: z.string(),
            text: z.string().optional(),
          }),
        })
      ),
    })
  ),
});

export type InstagramWebhook = z.infer<typeof InstagramWebhookSchema>;

/**
 * Mensagem parseada do Instagram
 */
export interface InstagramMessage {
  contaId: string;        // ID da conta do Forefy (recipient)
  contatoId: string;      // ID do usuário que enviou (sender)
  contatoMsg: string;     // Texto da mensagem
  data: Date;             // Timestamp da mensagem
  messageId: string;      // ID único da mensagem
}

/**
 * Verticais de estudo identificadas
 */
export enum VerticalEstudo {
  CONCURSOS = 'CONCURSOS',
  OAB = 'OAB',
  MAGISTRATURA = 'MAGISTRATURA',
  MEDICINA = 'MEDICINA',
  ITA_IME = 'ITA_IME',
  ENEM = 'ENEM',
  TOEFL = 'TOEFL',
  INFOPRODUTORES = 'INFOPRODUTORES',
  DESCONHECIDO = 'DESCONHECIDO',
}

/**
 * Etapas do funil de vendas
 */
export enum EtapaFunil {
  DIAGNOSTICO = 'Etapa 1: Diagnóstico',
  VERIFICACAO_MERCADO = 'Etapa 2: Verificação de Mercado',
  CLASSIFICACAO = 'Etapa 3: Classificação',
  INTENSIFICACAO = 'Etapa 4: Intensificação',
  PREMISSA_WAZE = 'Etapa 5: Premissa Waze',
  BENEFICIOS = 'Etapa 6: Benefícios',
  OFERTA = 'Etapa 7: Oferta',
  FECHAMENTO_LINK = 'Etapa 8/9: Fechamento/Link',
}

/**
 * Schema para o Structured Output do Agent
 */
export const AgentOutputSchema = z.object({
  current_funnel_stage: z.nativeEnum(EtapaFunil),
  identified_vertical: z.nativeEnum(VerticalEstudo),
  search_required: z.boolean(),
  search_query: z.string().optional(),
  response_message: z.string(),
  suggested_next_action: z.string().optional(),
});

export type AgentOutput = z.infer<typeof AgentOutputSchema>;

/**
 * Payload para envio de mensagem no Instagram
 */
export interface InstagramSendPayload {
  recipient: {
    id: string;
  };
  message: {
    text: string;
  };
}

/**
 * Resposta da API do Instagram
 */
export interface InstagramApiResponse {
  recipient_id: string;
  message_id: string;
}

/**
 * Erro customizado para falhas no Instagram API
 */
export class InstagramApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'InstagramApiError';
  }
}
