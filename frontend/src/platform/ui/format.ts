export const utc = (time: string | null) => time ? `${time.slice(0, 19).replace('T', ' ')} UTC` : 'Unknown';
export const ageLabel = (time: string | null, now: number) => time ? `${Math.max(0, Math.floor((now - Date.parse(time)) / 1000))} s ago` : 'Age unknown';
export const measure = (value: number | null, unit: string) => value === null ? 'Unknown' : `${value.toFixed(1)} ${unit}`;
export const safeSourceLink = (url: string) => /^https?:\/\//i.test(url) ? url : undefined;
