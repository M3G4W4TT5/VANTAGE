let displayZone = 'UTC';
const formatters = new Map<string, Intl.DateTimeFormat>();
export const setDisplayTimeZone = (zone: string) => { displayZone = zone; };
export const displayTimeZone = () => displayZone;
export const displayTime = (time: string | null) => {
  if (!time) return 'Unknown';
  const instant = new Date(time);
  if (Number.isNaN(instant.valueOf())) return 'Unknown';
  let formatter = formatters.get(displayZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: displayZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZoneName: 'short' });
    formatters.set(displayZone, formatter);
  }
  return formatter.format(instant);
};
// Retained for older presenters while their labels migrate to the display-time name.
export const utc = displayTime;
export const ageLabel = (time: string | null, now: number) => time ? `${Math.max(0, Math.floor((now - Date.parse(time)) / 1000))} s ago` : 'Age unknown';
export const measure = (value: number | null, unit: string) => value === null ? 'Unknown' : `${value.toFixed(1)} ${unit}`;
export const safeSourceLink = (url: string) => /^https?:\/\//i.test(url) ? url : undefined;
