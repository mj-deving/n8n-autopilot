# n8n-as-code (n8nac) — Vollstaendige Referenz

> Version: 1.0.0 | n8n: 2.11.2 | Stand: 2026-03-11

---

## Ueberblick

n8n-as-code (n8nac) ist ein CLI + VS Code Extension, das n8n-Workflows als **TypeScript-Dateien** mit Decorators verwaltet. Code-first statt UI-first.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  .workflow.ts │────>│  n8nac CLI   │────>│  n8n Server  │
│  (lokal)      │<────│  push/pull   │<────│  (remote)    │
└──────────────┘     └──────────────┘     └──────────────┘
       │                     │
       v                     v
┌──────────────┐     ┌──────────────┐
│  Git Repo    │     │  AI Skills   │
│  Versioning  │     │  537 Nodes   │
└──────────────┘     └──────────────┘
```

### Kernkonzept

- Workflows als `.workflow.ts` Dateien (TypeScript mit `@workflow`, `@node`, `@links` Decorators)
- Git-like Sync: `pull` → edit → `push` mit Optimistic Concurrency Control (OCC)
- AI-Recherche eingebaut: Node-Schemas, Docs, 7000+ Community-Templates
- VS Code Extension: Sidebar-Browser, Push-on-Save, Syntax-Highlighting

---

## 1. Installation

```bash
# CLI global
npm install -g n8nac

# VS Code Extension
code --install-extension etienne-lescot.n8n-as-code
```

---

## 2. Projekt-Setup

### 2.1 Initialisierung (2 Schritte)

```bash
# Schritt 1: Credentials speichern
npx n8nac init-auth --host http://localhost:5678 --api-key <KEY>

# Schritt 2: Projekt waehlen
npx n8nac init-project --project-index 1 --sync-folder workflows
```

Oder interaktiv: `npx n8nac init`

### 2.2 Erzeugte Dateien

```
n8nac-config.json          # Projekt-Konfiguration (host, syncFolder, projectId)
AGENTS.md                  # Auto-generierter AI-Kontext
.vscode/n8n.code-snippets  # VS Code Snippets
```

### 2.3 Credentials-Speicherort

```
~/AppData/Roaming/n8nac-nodejs/Config/credentials.json   # Windows
~/.config/n8nac-nodejs/Config/credentials.json            # Linux/Mac
```

Format: `{ "hosts": { "http://localhost:5678": "<JWT-API-KEY>" } }`

### 2.4 Config-Datei (n8nac-config.json)

```json
{
  "host": "http://localhost:5678",
  "syncFolder": "workflows",
  "projectId": "personal",
  "projectName": "Personal",
  "instanceIdentifier": "local_5678_marius _j"
}
```

Sync-Pfad wird automatisch gebaut: `{syncFolder}/{instanceIdentifier}/{projectName}/`

### 2.5 Projekt wechseln

```bash
npx n8nac switch   # Interaktiv anderes Projekt waehlen
```

---

## 3. Workflow-Management

### 3.1 List — Status aller Workflows

```bash
npx n8nac list              # Tabelle: Status | ID | Name | Local Path
npx n8nac list --local      # Nur lokale .workflow.ts Dateien
npx n8nac list --remote     # Nur remote Workflows in n8n
npx n8nac list --raw        # JSON-Output statt Tabelle
```

Status-Werte:
| Status | Bedeutung |
|--------|-----------|
| TRACKED | Lokal + Remote synchron |
| EXIST_ONLY_LOCALLY | Nur lokal, noch nicht gepusht |
| EXIST_ONLY_REMOTELY | Nur in n8n, noch nicht gepullt |
| CONFLICT | Lokal und remote unterschiedlich |

### 3.2 Pull — Von n8n herunterladen

```bash
npx n8nac pull <workflowId>
# Beispiel: npx n8nac pull 5bWFv8sC4a3OvMgP
```

- Erstellt/ueberschreibt die lokale `.workflow.ts` Datei
- IMMER vor dem Editieren pullen (sonst OCC-Conflict bei Push)

### 3.3 Push — Zu n8n hochladen

```bash
npx n8nac push <filename>
npx n8nac push <filename> --verify   # Push + Schema-Validierung
```

**WICHTIG:** `<filename>` ist NUR der Dateiname (z.B. `01-ai-news-kurator.workflow.ts`), KEIN Pfad!

- Neue Workflows bekommen automatisch eine n8n-ID
- Existierende Workflows werden aktualisiert (OCC-Check)
- n8nac formatiert den Code nach Push automatisch (Prettier-artig)

### 3.4 Fetch — Remote-State aktualisieren

```bash
npx n8nac fetch <workflowId>
```

Aktualisiert den internen Cache fuer Status-Vergleich, ohne die lokale Datei zu ueberschreiben.

### 3.5 Resolve — Konflikte loesen

```bash
npx n8nac resolve <workflowId> --mode keep-current    # Lokale Version behalten
npx n8nac resolve <workflowId> --mode keep-incoming    # Remote Version behalten
```

### 3.6 Verify — Live-Workflow validieren

```bash
npx n8nac verify <workflowId>
```

Holt den Workflow von n8n und prueft gegen lokale Node-Schemas. Erkennt:
- Ungueltige `typeVersion` (z.B. 1.6 wenn Schema nur [1, 2, 2.2] hat)
- Ungueltige `operation`-Werte
- Fehlende Pflichtparameter
- Unbekannte Node-Typen

---

## 4. Convert — Format-Konvertierung

```bash
# JSON → TypeScript
npx n8nac convert workflow.json

# TypeScript → JSON
npx n8nac convert my-workflow.workflow.ts

# Mit Output-Pfad
npx n8nac convert workflow.json -o my-workflow.workflow.ts

# Batch: ganzes Verzeichnis
npx n8nac convert-batch ./json-workflows/ --format typescript
npx n8nac convert-batch ./ts-workflows/ --format json -f
```

---

## 5. AI Skills — Recherche & Validierung

### 5.1 Search — Universale Suche

```bash
npx n8nac skills search "google sheets"       # Nodes + Docs + Tutorials
npx n8nac skills search "ai agent" --type node # Nur Nodes
npx n8nac skills search "webhook" --limit 5    # Begrenzte Ergebnisse
npx n8nac skills search "RAG" --json           # JSON-Output
```

### 5.2 Node-Info — Komplettes Node-Schema

```bash
npx n8nac skills node-info googleSheets        # TypeScript Interface + Beispiel
npx n8nac skills node-info agent               # AI Agent Schema
npx n8nac skills node-info telegram --json     # Als JSON
```

Liefert:
- Exakte Parameter-Namen und -Typen
- Verfuegbare `operations` / `resources`
- Required vs. Optional
- TypeScript-Interface + Beispielcode

### 5.3 Node-Schema — Kurzreferenz

```bash
npx n8nac skills node-schema googleSheets      # Kompakte Referenz
```

Wie `node-info`, aber ohne Docs/Beschreibung — nur der Code.

### 5.4 List — Verfuegbare Nodes/Docs/Guides

```bash
npx n8nac skills list --nodes     # Alle 537 Node-Namen
npx n8nac skills list --docs      # Alle Doku-Kategorien
npx n8nac skills list --guides    # Alle verfuegbaren Guides
```

### 5.5 Docs — Dokumentation lesen

```bash
npx n8nac skills docs "OpenAI"           # Doku-Seite abrufen
npx n8nac skills docs --list             # Alle Kategorien
npx n8nac skills docs --category "nodes" # Nach Kategorie filtern
```

### 5.6 Guides — Tutorials & Walkthroughs

```bash
npx n8nac skills guides "webhook"    # Suche nach Guides
npx n8nac skills guides --list       # Alle Guides
```

### 5.7 Related — Verwandte Nodes

```bash
npx n8nac skills related "telegram"    # Verwandte Nodes & Docs
```

### 5.8 Validate — Lokale Validierung

```bash
npx n8nac skills validate my-workflow.workflow.ts
npx n8nac skills validate my-workflow.workflow.ts --strict   # Warnings = Errors
```

### 5.9 Update-AI — AI-Kontext aktualisieren

```bash
npx n8nac update-ai     # AGENTS.md + VS Code Snippets neu generieren
```

---

## 6. Community Workflows (Examples)

7000+ Workflows von n8nworkflows.xyz.

```bash
# Suchen
npx n8nac skills examples search "telegram chatbot"
npx n8nac skills examples search "invoice pdf" --limit 5
npx n8nac skills examples search "RAG" --json

# Auflisten (neueste zuerst)
npx n8nac skills examples list
npx n8nac skills examples list --limit 50

# Details anzeigen
npx n8nac skills examples info 8582

# Als TypeScript herunterladen
npx n8nac skills examples download 8582
npx n8nac skills examples download 8582 -o my-agent.workflow.ts
npx n8nac skills examples download 8582 -f   # Ueberschreiben
```

---

## 7. TypeScript Workflow-Syntax

### 7.1 Grundstruktur

```typescript
import { workflow, node, links } from '@n8n-as-code/transformer';

@workflow({
    id: 'abc123',                    // n8n Workflow-ID (auto bei neuem Push)
    name: 'Mein Workflow',
    active: false,
    settings: { executionOrder: 'v1' },
})
export class MeinWorkflowWorkflow {
    @node({
        id: 'uuid-hier',
        name: 'Anzeigename',
        type: 'n8n-nodes-base.webhook',   // EXAKT aus node-info
        version: 2.1,                     // HOECHSTE aus Schema
        position: [0, 300],
        credentials: { ... },             // Optional
        webhookId: 'uuid',                // Nur fuer Webhook-Nodes
    })
    PropertyName = {
        // Parameter aus node-info
    };

    @links()
    defineRouting() {
        this.NodeA.out(0).to(this.NodeB.in(0));
    }
}
```

### 7.2 Verbindungen

```typescript
// Regulaere Datenverbindung
this.NodeA.out(0).to(this.NodeB.in(0));

// Switch mit mehreren Outputs
this.Switch.out(0).to(this.Branch1.in(0));   // Erste Regel
this.Switch.out(1).to(this.Branch2.in(0));   // Zweite Regel
this.Switch.out(2).to(this.Branch3.in(0));   // Fallback

// Merge mit mehreren Inputs
this.FeedA.out(0).to(this.Merge.in(0));
this.FeedB.out(0).to(this.Merge.in(1));
```

### 7.3 AI Sub-Nodes (.uses())

```typescript
// RICHTIG: AI-Nodes IMMER mit .uses()
this.Agent.uses({
    ai_languageModel: this.GeminiModel.output,      // Einzeln
    ai_memory: this.Memory.output,                    // Einzeln
    ai_tool: [this.Tool1.output, this.Tool2.output],  // Array!
    ai_outputParser: this.Parser.output,              // Einzeln
});

// FALSCH: .out().to() fuer AI-Nodes → kaputte Verbindungen!
```

Regel: `ai_tool` ist IMMER ein Array. Alle anderen (`ai_languageModel`, `ai_memory`, `ai_outputParser`) sind Einzelreferenzen.

### 7.4 Workflow-Map (auto-generiert)

Jede `.workflow.ts` bekommt nach Push einen `<workflow-map>` Block:

```
// <workflow-map>
// Workflow : Name
// Nodes   : 8  |  Connections: 8
//
// NODE INDEX        (Property-Name → Node-Typ → Flags)
// ROUTING MAP       (Datenfluss als ASCII-Baum)
// AI CONNECTIONS    (.uses() Verbindungen)
// </workflow-map>
```

---

## 8. Arbeitsablauf (Best Practices)

```
1. Recherche     npx n8nac skills search "thema"
                 npx n8nac skills node-info <node>
                 npx n8nac skills examples search "thema"

2. Pull          npx n8nac pull <id>        (bei existierendem WF)

3. Schreiben     .workflow.ts erstellen/editieren

4. Validieren    npx n8nac skills validate <datei>

5. Push          npx n8nac push <datei>
                 npx n8nac push <datei> --verify

6. Testen        n8n UI oder Webhook-Calls

7. Committen     git add + git commit
```

---

## 9. Gotchas & Tipps

| Problem | Loesung |
|---------|---------|
| Push rejected (OCC) | Zuerst `pull`, dann editieren, dann `push` |
| Node-Parameter falsch | IMMER `node-info` pruefen, nie raten |
| Webhook 404 nach Push | `webhookId` im `@node` Decorator + deactivate/reactivate |
| AI-Node kaputt | `.uses()` statt `.out().to()` fuer LLM/Memory/Tools |
| jsCode Syntax-Error | Kein heredoc, single-line mit `\n`, Write/Edit Tool nutzen |
| Gemini + Tools | Alle Tools brauchen `type: OBJECT` Schema |
| Push-Filename | NUR Dateiname, KEIN Pfad (n8nac loest den Pfad auf) |
| typeVersion falsch | HOECHSTE Version aus Schema nehmen |
| `convert` verliert Daten | Immer Backup/Git vor Konvertierung |
| Sync-Pfad mit Leerzeichen | Funktioniert, aber Pfade in Quotes setzen |

---

## 10. VS Code Extension Features

- **Sidebar**: Workflow-Browser mit Status-Anzeige
- **Push-on-Save**: Automatischer Push beim Speichern (konfigurierbar)
- **Syntax-Highlighting**: TypeScript Decorators
- **Code-Snippets**: Auto-generiert via `update-ai`
- **Inline-Docs**: Hover ueber Node-Typen zeigt Infos

---

## 11. Umgebungsvariablen

| Variable | Beschreibung |
|----------|-------------|
| `N8N_API_KEY` | API-Key statt `--api-key` Flag |
| `N8N_HOST` | Host-URL statt `--host` Flag |

---

*Referenz erstellt am 2026-03-11 basierend auf n8nac v1.0.0*
