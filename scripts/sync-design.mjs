// Scarica da Stitch il design system del progetto e lo scrive in DESIGN.md.
// Uso: pnpm design:sync  (richiede la variabile d'ambiente STITCH_API_KEY)
import { writeFile } from "node:fs/promises";

const PROJECT_ID = "148620745884280817"; // Stitch: "ASDP Delivery Workspace"
const key = process.env.STITCH_API_KEY;
if (!key) throw new Error("Variabile STITCH_API_KEY mancante");

const res = await fetch("https://stitch.googleapis.com/mcp", {
  method: "POST",
  headers: {
    "X-Goog-Api-Key": key,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "list_design_systems", arguments: { projectId: PROJECT_ID } },
  }),
});
if (!res.ok) throw new Error(`Stitch ha risposto ${res.status}`);

const { designSystems } = JSON.parse((await res.json()).result.content[0].text);
const designMd = designSystems?.[0]?.designSystem?.theme?.designMd;
if (!designMd) throw new Error("Nessun design system con DESIGN.md nel progetto Stitch");

await writeFile("DESIGN.md", designMd.endsWith("\n") ? designMd : `${designMd}\n`);
console.log("DESIGN.md aggiornato da Stitch. Controlla il diff e allinea i token in src/app/globals.css.");
