import axios, { AxiosInstance } from 'axios';
import config from '../config';

const { logger } = config;

interface UltravoxCallResponse {
  callId: string;
  status: string;
}

class UltravoxService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.ULTRAVOX_API_URL || 'https://api.ultravox.ai',
      headers: {
        'Authorization': `Bearer ${process.env.ULTRAVOX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10s timeout
    });
  }

  async initiateCall(
    phoneNumber: string,
    script: string,
    variables: Record<string, string>,
    callbackUrl: string,
    voice: string,
    language: string,
    firstMessage: string
  ): Promise<UltravoxCallResponse> {
    try {
      const response = await this.client.post('/api/calls', {
        phoneNumber,
        script,
        scriptVariables: variables,
        callbackUrl,
        voiceType: voice,
        language,
        firstMessage,
        telnyxConfig: {
          fromNumber: process.env.TELNYX_FROM_NUMBER || '+1234567890',
        },
      });

      logger.info('Call initiated via Ultravox', { callId: response.data.callId });
      return {
        callId: response.data.callId,
        status: response.data.status,
      };
    } catch (err) {
      logger.error('Failed to initiate call via Ultravox', {
        phoneNumber,
        error: (err as Error).message,
        response: (err as any).response?.data,
      });
      throw new Error(`Ultravox call failed: ${(err as Error).message}`);
    }
  }
}

export default new UltravoxService();