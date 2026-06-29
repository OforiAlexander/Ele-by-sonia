import axios from 'axios';
import crypto from 'crypto';

const paystackClient = axios.create({
    baseURL: 'https://api.paystack.co',
    headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
    },
});

export type MomoProvider = 'mtn' | 'vod' | 'atl';

export interface ChargePayload {
    email: string;
    amount: number;
    currency?: string;
    mobile_money?: {
        phone: string;
        provider: MomoProvider;
    };
    reference?: string;
}

export interface PaystackChargeResponse {
    status:  boolean;
    message: string;
    data: {
        status:    string;
        reference: string;
        [key: string]: unknown;
    };
}

function assertSecretKey(): void {
    if (!process.env.PAYSTACK_SECRET_KEY) {
        throw Object.assign(
            new Error('PAYSTACK_SECRET_KEY is not configured.'),
            { status: 500, code: 'MISCONFIGURED' },
        );
    }
}

export function detectMomoProvider(rawPhone: string): MomoProvider | null {
    const digits = rawPhone.replace(/\D/g, '');
    const local  = digits.startsWith('233') ? '0' + digits.slice(3) : digits;
    const prefix = local.slice(0, 3);

    const MTN: string[] = ['024', '054', '055', '025', '059', '053'];
    const VOD: string[] = ['020', '050'];
    const ATL: string[] = ['026', '056', '027', '057', '023', '028'];

    if (ATL.includes(prefix)) return 'atl';
    if (VOD.includes(prefix)) return 'vod';
    if (MTN.includes(prefix)) return 'mtn';
    return null;
}

export const paystack = {
    async charge(payload: ChargePayload): Promise<PaystackChargeResponse> {
        assertSecretKey();
        const { data } = await paystackClient.post<PaystackChargeResponse>('/charge', {
            ...payload,
            currency: payload.currency ?? process.env.PAYSTACK_CURRENCY ?? 'GHS',
        });
        return data;
    },

    async verifyTransaction(reference: string): Promise<PaystackChargeResponse> {
        assertSecretKey();
        const { data } = await paystackClient.get<PaystackChargeResponse>(
            `/transaction/verify/${reference}`,
        );
        return data;
    },

    verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
        if (!process.env.PAYSTACK_SECRET_KEY) return false;
        const hash = crypto
            .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
            .update(rawBody)
            .digest('hex');
        return hash === signature;
    },
};
