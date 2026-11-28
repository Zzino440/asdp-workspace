import type { FieldValue } from "./front-matter";

// Campi del frontespizio gestiti dal flusso di approvazione: solo chi ha "approve" li cambia.
export const APPROVAL_FIELDS = ["approvato_da", "approvato_il", "versione_approvata", "evidenza_approvazione"];

const empty = (value: unknown) => value === null || value === undefined || String(value).trim() === "";

// Aggiornamento di un documento Approvato che lo riporta In corso con i dati di approvazione vuoti,
// insieme a un testo cambiato: è quello che fa una skill in aggiornamento, e ha lo stesso effetto del
// ritorno automatico a In corso di saveDocument. Lo può fare anche chi non approva.
export function withdrawsApproval(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  bodyChanged: boolean,
) {
  return (
    bodyChanged &&
    before.stato === "Approvato" &&
    after.stato === "In corso" &&
    APPROVAL_FIELDS.every((key) => empty(after[key]))
  );
}

// true se il salvataggio cambia lo stato Approvato o i dati di approvazione in un modo riservato a
// chi approva (tranne il ritiro dell'approvazione descritto sopra).
export function changesApproval(before: Record<string, unknown>, after: Record<string, unknown>, bodyChanged = false) {
  if (withdrawsApproval(before, after, bodyChanged)) return false;
  const same = (key: string) => JSON.stringify(before[key] ?? null) === JSON.stringify(after[key] ?? null);
  const approvedBefore = before.stato === "Approvato";
  const approvedAfter = after.stato === "Approvato";
  return approvedBefore !== approvedAfter || !APPROVAL_FIELDS.every(same);
}

// Stato In corso e dati di approvazione svuotati, solo sulle chiavi già presenti nel frontespizio.
export function clearedApproval(front: Record<string, unknown>) {
  const changes: Record<string, FieldValue> = { stato: "In corso" };
  for (const key of [...APPROVAL_FIELDS, "gate"]) if (key in front) changes[key] = null;
  return changes;
}
