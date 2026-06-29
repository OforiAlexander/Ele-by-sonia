export function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('en-GH', {
        timeZone: 'Africa/Accra',
        day:      'numeric',
        month:    'short',
        year:     'numeric',
        hour:     '2-digit',
        minute:   '2-digit',
    });
}

export function toLocalDate(d: Date): string {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
