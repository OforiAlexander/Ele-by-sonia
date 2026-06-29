import { Router, Request, Response } from 'express';
import { paystack } from '../../services/payment/paystack';
import { markSalePaid, markSaleFailed } from '../api/sales/sales.service';
import { get } from '../../startup/settingsCache';
import { SETTINGS } from '../../constants/settings';
import logger from '../../services/logger';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['x-paystack-signature'] as string | undefined;

    if (!signature || !paystack.verifyWebhookSignature(req.body as Buffer, signature)) {
        res.status(401).json({ error: 'Invalid signature.' });
        return;
    }

    let event: { event: string; data: { reference: string; status: string } };
    try {
        event = JSON.parse((req.body as Buffer).toString('utf8'));
    } catch {
        res.status(400).json({ error: 'Invalid JSON.' });
        return;
    }

    res.sendStatus(200);

    const { reference } = event.data ?? {};
    if (!reference) return;

    const autoVerify = get(SETTINGS.MOMO_AUTO_VERIFY_ON_WEBHOOK)?.value !== 'false';
    if (!autoVerify) {
        logger.info('[webhook] auto-verify disabled — skipping event %s for ref %s', event.event, reference);
        return;
    }

    try {
        if (event.event === 'charge.success') {
            await markSalePaid(reference);
            logger.info('[webhook] momo payment confirmed for ref %s', reference);
        } else if (event.event === 'charge.failed') {
            await markSaleFailed(reference);
            logger.warn('[webhook] momo payment failed for ref %s', reference);
        }
    } catch (err) {
        logger.error('[webhook] error processing event %s for ref %s: %o', event.event, reference, err);
    }
});

export default router;
