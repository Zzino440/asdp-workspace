# Desktop Extension di sviluppo

Pacchetto `.mcpb` per collegare **Claude Desktop** al server MCP di ASDP Workspace in locale o sul
cloud di test, come l'estensione di Tarko. Dentro c'è solo `mcp-remote` (versione fissa in
`package.json`): un ponte stdio che inoltra le chiamate a `<url>/api/mcp` e fa il login OAuth
aprendo il browser e ricevendo il ritorno su `localhost` (la pagina di consenso lo accetta).
Non tocca l'app né il plugin `asdp`: i tool sono quelli del server, quindi una modifica all'app
si vede senza rifare il pacchetto.

Solo per sviluppo e prove. Per PM e AF il canale è il plugin `asdp`.

## Generare il pacchetto

```bash
cd mcpb
npm install --omit=dev
npx @anthropic-ai/mcpb validate manifest.json
npx @anthropic-ai/mcpb pack . asdp-workspace-dev.mcpb
```

`node_modules/` e `*.mcpb` non si committano.

## Installare e usare

1. Doppio clic su `asdp-workspace-dev.mcpb` (o Claude Desktop → Impostazioni → Estensioni →
   installa da file).
2. Indirizzo: `http://127.0.0.1:4100/api/mcp` per il locale (dev server avviato), oppure
   `https://asdp-workspace.vercel.app/api/mcp` per il cloud di test (se acceso).
3. Al primo uso si apre il browser: login nell'app (in locale con gli utenti del seed) e
   **Consenti**.

Disattiva intanto il server `asdp-workspace` del plugin `asdp`, se è installato: due server
uguali danno tool doppi. Il token resta in `~/.mcp-auth/`; per cambiare utente cancella quella
cartella.
