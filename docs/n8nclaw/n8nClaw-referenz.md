# n8nClaw Referenz — WF6 Implementierung

> Quelle: [GitHub shabbirun/n8nclaw](https://github.com/shabbirun/n8nclaw) | [YouTube Tutorial](https://www.youtube.com/watch?v=jPea9Sp9xYQ) | Template: `template.json.txt`
> Lizenz: MIT

---

## 1. Was ist n8nClaw?

Persoenlicher KI-Assistent als einzelner n8n-Workflow. Multi-Channel (Telegram, WhatsApp, Gmail), persistent Memory, Task Management, autonomes Arbeiten via Heartbeat.

Erstellt von **shabbirun** (Shabbir), inspiriert von OpenClaw.

---

## 2. Architektur-Uebersicht

```
TRIGGERS                          CORE AGENT                    OUTPUT
┌──────────────┐                ┌──────────────┐            ┌──────────┐
│ Telegram     │──┐             │  n8nClaw     │──Switch──► │ Telegram │
│ WhatsApp     │──┤  normalize  │  (AI Agent)  │            │ WhatsApp │
│ Gmail        │──┼────────────►│              │            └──────────┘
│ Heartbeat    │──┘             │  + Memory    │
└──────────────┘                │  + Tools     │
                                │  + SubAgents │
                                └──────────────┘
```

### Flow pro Kanal:
1. **Trigger** → empfaengt Nachricht
2. **Filter** → validiert Absender (Chat-ID / Telefonnummer)
3. **Get row(s)** → holt User-Profil aus Init-DataTable
4. **Edit Fields** → normalisiert auf 3 Felder:
   - `user_message` (Text der Nachricht)
   - `system_prompt_details` (username, soul, user aus DB)
   - `last_channel` (telegram/whatsapp/email)
5. **n8nClaw Agent** → verarbeitet mit LLM + Tools
6. **Switch** → routet Antwort zurueck zum Ursprungskanal

### Telegram-Spezial: Media Handling
- Switch1 prueft: Voice? Image? Document? Text?
- Voice → `Get a file` → Gemini 2.5 Flash (Transkription)
- Image → `Get a file` → Gemini (Bildanalyse)
- Document → `Get a file` → Gemini 2.5 Flash (Dokumentanalyse)
- Text → direkt weiter zu Edit Fields

---

## 3. Core Agent: n8nClaw

| Eigenschaft | Wert |
|---|---|
| Node-Typ | `@n8n/n8n-nodes-langchain.agent` (v3) |
| LLM | Claude Sonnet 4.5 via OpenRouter |
| Memory | Postgres Chat Memory (15 Nachrichten) |
| Prompt-Typ | `define` (System-Prompt im Node) |

### System-Prompt (Zusammenfassung):
- Persoenlichkeit durch `soul`-Feld (Name, Vibe, Zweck)
- Lebendes `user`-Profil — Agent aktualisiert es selbst
- Task/Subtask-Management ueber DataTable-Tools
- Kann Vector Store abfragen fuer Kontext aus vergangenen Gespraechen
- Hat Zugriff auf Email-Agent, Research-Agent, Document-Agent, Worker-Agents
- Anweisung: Worker-Agents MUESSEN benutzt werden fuer parallele Arbeit
- Document-Agent erhaelt NUR fertige Arbeit zum Speichern

### Initialization / Onboarding:
Wenn username/soul/user leer sind, fragt der Agent diese 3 Dinge ab:
1. **username**: Eindeutiger Identifier
2. **soul**: Name + Vibe + Zweck des Assistenten
3. **user**: Profil des Benutzers (Interessen, Ziele, Praeferenzen)

---

## 4. Data Tables (n8n built-in)

### Init Table (User-Profil)
| Spalte | Typ | Zweck |
|---|---|---|
| username | string | Eindeutiger User-ID |
| soul | string | Agent-Persoenlichkeit |
| user | string | User-Profil (lebend) |
| heartbeat | string | Letzter Heartbeat-Status |
| last_channel | string | Letzter Kommunikationskanal |
| last_vector_id | number | Letzte verarbeitete Chat-History ID |

### Tasks Table
| Spalte | Typ | Zweck |
|---|---|---|
| task_name | string | Aufgabenname |
| task_details | string | Details/Fortschritt |
| task_complete | boolean | Erledigt? |
| Is_recurring | boolean | Wiederkehrend? |

### Subtasks Table
| Spalte | Typ | Zweck |
|---|---|---|
| parent_task_id | string | Referenz auf Task |
| subtask_name | string | Unteraufgabe |
| subtask_details | string | Details |
| subtask_complete | boolean | Erledigt? |

---

## 5. Tools (direkt am Agent)

| Tool-Name | Node-Typ | Aktion |
|---|---|---|
| Get Tasks | dataTableTool | Tasks lesen |
| Upsert Task | dataTableTool | Task anlegen/aktualisieren |
| Get Subtasks | dataTableTool | Subtasks nach parent_task_id |
| Upsert Subtask | dataTableTool | Subtask anlegen/aktualisieren |
| Initialization - Update Info | dataTableTool | Erstes Onboarding (username/soul/user) |
| Update User and Heartbeat | dataTableTool | Profil + Heartbeat aktualisieren |
| Supabase Vector Store1 | vectorStoreSupabase | RAG: vergangene Gespraeche abfragen |

---

## 6. Sub-Agents

Alle Sub-Agents sind `agentTool` Nodes, die als Tools am Haupt-Agent haengen.

| Agent | LLM | Memory | Tools | Zweck |
|---|---|---|---|---|
| Research Agent | Gemini 3 Flash (OpenRouter) | Simple Memory (10 msgs) | Tavily, Wikipedia | Web-Recherche |
| Email Manager | Haiku 4.5 (OpenRouter) | Simple Memory (10 msgs) | Gmail: markRead, reply, get, delete, send, getMany | Email-Verwaltung |
| Document Manager | Haiku 4.5 (OpenRouter) | Simple Memory (20 msgs) | Google Docs: create/get/update, Drive: delete/folder/move/search | Dokument-Verwaltung |
| Worker 1 | Haiku 4.5 (OpenRouter) | Simple Memory (20 msgs) | Document Manager (shared) | Einfache Aufgaben |
| Worker 2 | Sonnet 4.5 (OpenRouter) | Simple Memory (20 msgs) | Document Manager (shared) | Mittlere Aufgaben |
| Worker 3 | Opus 4.6 (OpenRouter) | Simple Memory (20 msgs) | Document Manager (shared) | Komplexe Aufgaben |

**Wichtig**: Document Manager ist als Tool an n8nClaw UND an alle 3 Worker Agents angebunden.

---

## 7. Long-Term Memory Pipeline (separater Flow)

Laeuft als Schedule Trigger (alle X Minuten):

```
Data Loader (Schedule)
  → Get row(s)1 (Init: last_vector_id holen)
  → Execute SQL query (neue Chat-History aus Postgres)
  → Aggregate (Nachrichten zusammenfassen)
  → Basic LLM Chain (Haiku 4.5: Zusammenfassung erstellen)
  → Structured Output Parser ({"summary":"text"})
  → Supabase Vector Store (Embeddings speichern)
  → Update row(s) (last_vector_id aktualisieren)
```

Embeddings: OpenAI Embeddings → Supabase pgvector

---

## 8. Output-Routing

```
n8nClaw → Switch (last_channel)
  ├── "telegram" → Send a text message (Telegram Bot API, Markdown)
  └── "whatsapp" → Enviar texto (Evolution API)
```

Der Switch prueft `last_channel` aus dem Edit Fields Node.

---

## 9. Credentials / Services

| Service | Wofuer | Kostenlos? |
|---|---|---|
| OpenRouter | Alle LLMs | Nein (Pay-per-use) |
| Telegram Bot | Trigger + Send | Ja |
| Postgres | Chat Memory | n8n-intern oder extern |
| Supabase | Vector Store (pgvector) | Ja (Free Tier: 500MB) |
| OpenAI | Embeddings | Nein |
| Tavily | Web-Recherche | Ja (Free: 1000 req/mo) |
| Gmail OAuth2 | Email-Management | Ja (Google account) |
| Google Docs/Drive | Dokumente | Ja (Google account) |
| Evolution API | WhatsApp | Self-hosted (kostenlos) |
| Google AI (Gemini) | Media-Processing | Ja (Free Tier) |

---

## 10. Platzhalter im Template

| Platzhalter | Ersetzen durch |
|---|---|
| `YOUR_USERNAME` | Gewaehlter Username |
| `YOUR_TELEGRAM_CHAT_ID` | Telegram Chat-ID (443039215) |
| `YOUR_PHONE` | Telefonnummer (WhatsApp) |
| `YOUR_EVOLUTION_INSTANCE` | Evolution API Instance |
| `YOUR_WEBHOOK_PATH` | Webhook-Pfad |
| `YOUR_INIT_TABLE_ID` | n8n Data Table ID (Init) |
| `YOUR_TASKS_TABLE_ID` | n8n Data Table ID (Tasks) |
| `YOUR_SUBTASKS_TABLE_ID` | n8n Data Table ID (Subtasks) |
| `YOUR_PROJECT_ID` | n8n Projekt-ID |

---

## 11. WF6 Implementierungsplan — Schrittweiser Aufbau

### Phase 1: Kern (MVP) ✅ ERLEDIGT
**Ziel**: Chat Trigger → AI Agent mit Profil + Tasks

Umgesetzt:
- Chat Trigger (n8n UI) als Einstieg
- n8n Data Tables: Init, Tasks, Subtasks (via API angelegt)
- Edit Fields (normalize: user_message, system_prompt_details, last_channel)
- AI Agent (Gemini 2.0 Flash) mit Original n8nClaw System-Prompt
- DataTable Tools: Get/Upsert Tasks, Get/Upsert Subtasks, Update User Info
- Think Tool + DatumZeit Tool
- Buffer Memory (15 Nachrichten)
- Onboarding-Flow (username → soul → user Abfrage)

Abweichungen vs. Original:
- Chat Trigger statt Telegram (HTTPS-Tunnel fehlte)
- Gemini 2.0 Flash statt Claude Sonnet via OpenRouter
- Buffer Memory statt Postgres Chat Memory
- Keine Sub-Agents, kein Vector Store, kein Media Handling

### Phase 2: Telegram + Media Handling ← AKTUELL
**Ziel**: Telegram als Eingangskanal + Voice/Image/Document-Verarbeitung

Schritt 2a — Telegram Trigger:
- n8n mit N8N_TUNNEL_ENABLED=true starten (HTTPS fuer Telegram Webhook)
- Telegram Trigger Node hinzufuegen (Credential: nzmbw9ZNGZdA9sZp)
- Filter Node (Chat-ID: 443039215)
- Chat Trigger bleibt als alternativer Eingang bestehen
- Beide Trigger → GetInitProfile → EditFields → Agent

Schritt 2b — Media Handling:
- Switch1 nach Filter: Voice / Image / Document / Text
- 3x "Get a file" (Telegram Download: voice.file_id, photo[3].file_id, document.file_id)
- Gemini Transkription (Voice → gemini-2.5-flash, resource: audio)
- Gemini Bildanalyse (Image → gemini-2.5-flash, resource: image, operation: analyze)
- Gemini Dokumentanalyse (Document → gemini-2.5-flash, resource: document)
- Edit Fields: user_message mit $if-Kette aus allen Analyse-Ergebnissen
- Text-Nachrichten → direkt zu Edit Fields (kein Media Processing)

Voraussetzungen:
- Google AI (Gemini) Credential (haben wir: FVE8T8mYCgIRpSyv)
- Telegram Bot Credential (haben wir: nzmbw9ZNGZdA9sZp)
- HTTPS-Tunnel fuer Telegram Webhook

### Phase 3: Heartbeat + Autonomie
- Schedule Trigger (stuendlich)
- Agent prueft offene Tasks und arbeitet selbststaendig
- Edit Fields2 mit "See what's pending and start working on it"
- Output-Routing: Switch nach last_channel (telegram/chat)

### Phase 4: Long-Term Memory
- Supabase einrichten (Free Tier)
- Chat-History summarisieren + embedden (Gemini statt OpenAI Embeddings?)
- Vector Store als RAG-Tool am Agent
- Memory Pipeline: Schedule → SQL → Aggregate → Summarize → Embed → Store

### Phase 5: Sub-Agents
- Research Agent (Gemini + Tavily Free Tier)
- Worker Agents (Gemini, dynamischer System-Prompt via $fromAI)
- Weitere Agents (Email, Document) je nach Bedarf und verfuegbaren Credentials

### Phase 6: Weitere Kanaele
- Gmail Trigger + Email Manager Agent
- WhatsApp via Evolution API (VPS: 213.199.32.18)
- Output-Switch erweitern (telegram/whatsapp/email)

---

## 12. Gotchas aus Template-Analyse

1. **`$fromAI()` in DataTable Tools**: Template nutzt `$fromAI()` damit der Agent die Filter-Werte selbst bestimmt
2. **Mehrfach-Connections bei Document Manager**: Ist als Tool an 4 Agents gleichzeitig angebunden (n8nClaw + 3 Worker)
3. **last_channel Routing**: Switch prueft komplexen `$if`-Chain ueber alle Edit Fields Nodes
4. **Webhook-IDs**: Viele Nodes haben `webhookId` — beim Push via n8nac muessen diese UUIDs erhalten bleiben
5. **Init-Onboarding**: Wenn Init-Table leer, enthaelt system_prompt Anweisungen zum Sammeln der 3 Pflichtfelder
6. **Heartbeat user_message**: Ist hardcoded "See what's pending and start working on it" — nicht konfigurierbar
7. **Gemini fuer Media**: Template nutzt `googleGemini` Node (nicht den Langchain-Wrapper) fuer Audio/Image/Document
