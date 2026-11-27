// "3 ore fa", "ieri": tempo trascorso in italiano.
export function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  const rtf = new Intl.RelativeTimeFormat("it", { numeric: "auto" });
  if (minutes < 60) return rtf.format(-minutes, "minute");
  if (minutes < 60 * 24) return rtf.format(-Math.round(minutes / 60), "hour");
  return rtf.format(-Math.round(minutes / (60 * 24)), "day");
}

// Data di modifica come la mostra SharePoint: "Pochi secondi fa", "12 minuti fa", "3 ore fa",
// "Ieri alle 14:32", "Lunedì alle 09:10" (ultima settimana), "20 novembre", "20 novembre 2025".
// Fuso fisso, così server e browser scrivono la stessa cosa.
const TZ = "Europe/Rome";
const day = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: TZ });

export function modifiedLabel(iso: string, now = Date.now()) {
  const date = new Date(iso);
  const minutes = Math.floor((now - date.getTime()) / 60_000);
  const time = date.toLocaleTimeString("it-IT", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  const daysAgo = Math.round((Date.parse(day(new Date(now))) - Date.parse(day(date))) / 86_400_000);
  if (minutes < 1) return "Pochi secondi fa";
  if (minutes < 60) return minutes === 1 ? "1 minuto fa" : `${minutes} minuti fa`;
  if (daysAgo === 0) return minutes < 120 ? "Circa un'ora fa" : `${Math.floor(minutes / 60)} ore fa`;
  if (daysAgo === 1) return `Ieri alle ${time}`;
  if (daysAgo < 7) {
    const weekday = date.toLocaleDateString("it-IT", { timeZone: TZ, weekday: "long" });
    return `${weekday[0].toUpperCase()}${weekday.slice(1)} alle ${time}`;
  }
  const sameYear = day(date).slice(0, 4) === day(new Date(now)).slice(0, 4);
  return date.toLocaleDateString("it-IT", { timeZone: TZ, day: "numeric", month: "long", year: sameYear ? undefined : "numeric" });
}

// Data e ora complete, per il tooltip.
export const fullDateTime = (iso: string) =>
  new Date(iso).toLocaleString("it-IT", { timeZone: TZ, dateStyle: "full", timeStyle: "short" });
