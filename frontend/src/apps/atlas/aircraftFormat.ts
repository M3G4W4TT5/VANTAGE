export const utc = (time: string | null) => time ? `${time.slice(0, 19).replace('T', ' ')} UTC` : 'Unknown';
export const ageLabel = (time: string | null, now: number) => time ? `${Math.max(0, Math.floor((now - Date.parse(time)) / 1000))} s ago` : 'Age unknown';
