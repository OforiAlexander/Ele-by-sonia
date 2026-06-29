import { useState, useEffect } from 'react';
import api from '../api';
import type { PublicSettings } from '../types';

export function usePublicSettings(): PublicSettings {
    const [publicSettings, setPublicSettings] = useState<PublicSettings>({});

    useEffect(() => {
        api.get('/settings/public')
            .then((res: { data: { data: PublicSettings } }) =>
                setPublicSettings(res.data.data ?? {}),
            )
            .catch(() => {});
    }, []);

    return publicSettings;
}
