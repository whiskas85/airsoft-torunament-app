const dataOra = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Rome' });
const ora = new Intl.DateTimeFormat('it-IT', { timeStyle: 'short', timeZone: 'Europe/Rome' });

export const fmtDataOra = (d: Date | string | null | undefined) => (d ? dataOra.format(new Date(d)) : '—');
export const fmtOra = (d: Date | string | null | undefined) => (d ? ora.format(new Date(d)) : '—');

const data = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Rome' });
export const fmtData = (d: Date | string | null | undefined) => (d ? data.format(new Date(d)) : '—');
