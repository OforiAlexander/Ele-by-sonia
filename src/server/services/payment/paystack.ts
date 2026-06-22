import axios from 'axios';

const PAYSTACK_BASE = 'https://api.paystack.co'; // payslack api base url must go

const paystackClient = axios.create({
  baseURL: PAYSTACK_BASE,
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

export interface ChargePayload {
  email: string;
  amount: number;
  currency?: string;
  mobile_money?: {
    phone: string;
    provider: string;
  };
  reference?: string;
}

export const paystack = {
  async charge(payload: ChargePayload) {
    const { data } = await paystackClient.post('/charge', {
      ...payload,
      currency: payload.currency ?? process.env.PAYSTACK_CURRENCY,
    });
    return data;
  },

  async verifyTransaction(reference: string) {
    const { data } = await paystackClient.get(`/transaction/verify/${reference}`);
    return data;
  },

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(rawBody)
      .digest('hex');
    return hash === signature;
  },
};
