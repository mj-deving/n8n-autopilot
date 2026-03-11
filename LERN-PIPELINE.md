# n8n Lern-Pipeline: 4 AI-fokussierte Automationen
> Alles via Code (n8n-as-code CLI + VS Code Extension)
> Stand: 2026-03-11

---

## Toolchain & Workflow

```
  +------------------+     +------------------+     +------------------+
  |   VS Code        |     |   n8nac CLI      |     |   n8n Instance   |
  |                  |     |                  |     |                  |
  |  .workflow.ts    | --> |  validate        | --> |  localhost:5678  |
  |  editieren       |     |  push            |     |  ausfuehren      |
  |  Sidebar-Browse  |     |  pull            |     |  testen          |
  |  push-on-save    |     |  skills search   |     |  debuggen        |
  +------------------+     +------------------+     +------------------+
         |                        |
         v                        v
  +------------------+     +------------------+
  |   Git            |     |   AI Skills      |
  |                  |     |                  |
  |  Versionierung   |     |  537 Nodes       |
  |  der Workflows   |     |  10.209 Props    |
  |                  |     |  7.702 Templates |
  +------------------+     +------------------+
```

### Arbeitsablauf pro Workflow

```
  1. Recherche    npx n8nac skills search "thema"
                  npx n8nac skills node-info <node>
                  npx n8nac skills examples search "thema"
       |
  2. Schreiben    .workflow.ts Datei erstellen (TypeScript mit Decorators)
       |
  3. Validieren   npx n8nac skills validate workflow.workflow.ts
       |
  4. Deployen     npx n8nac push workflows/.../workflow.workflow.ts
       |
  5. Testen       n8n UI: manuell ausfuehren, Output inspizieren
       |
  6. Iterieren    Code anpassen -> push -> testen
       |
  7. Committen    git add + git commit
```

---

## Setup-Phase (einmalig)

### Schritt 0: Voraussetzungen

| Tool             | Status    | Aktion                              |
|------------------|-----------|-------------------------------------|
| Node.js 24       | Vorhanden | --                                  |
| n8n 2.11.2       | Laeuft    | http://localhost:5678               |
| VS Code          | Vorhanden | --                                  |
| OpenAI API Key   | Benoetigt | platform.openai.com -> API Keys     |
| Git              | Vorhanden | --                                  |

### Schritt 1: n8n-as-code installieren

```bash
# CLI global installieren
npm install -g n8nac

# VS Code Extension installieren
code --install-extension etienne-lescot.n8n-as-code
```

### Schritt 2: Projekt initialisieren

```bash
cd ~/Projects/n8n-explore

# n8n API Key erstellen:
# n8n UI -> Settings -> API -> Create API Key

# Projekt initialisieren
npx n8nac init
# -> Host: http://localhost:5678
# -> API Key: <aus n8n UI>
# -> Sync Folder: workflows
# -> Project: Personal
```

### Schritt 3: Git Repository anlegen

```bash
git init
git add n8nac-config.json LERN-PIPELINE.md n8n-referenz.md
git commit -m "Initial: n8n-as-code Projekt"
```

### Ergebnis: Projektstruktur

```
n8n-explore/
  n8nac-config.json          # n8nac Konfiguration
  n8n-referenz.md            # Referenzdokument
  LERN-PIPELINE.md           # Dieser Plan
  AGENTS.md                  # Auto-generiert (AI-Kontext)
  .vscode/
    n8n.code-snippets        # Auto-generiert
  workflows/
    local_5678_user/
      personal/
        00-notification-hub.workflow.ts   # WF0: Sub-Workflow
        01-ai-news-kurator.workflow.ts    # WF1
        02-ai-email-assistent.workflow.ts # WF2
        03-ai-personal-agent.workflow.ts  # WF3
        04-ai-dokument-pipeline.workflow.ts # WF4
```

---

## WF0: Notification Hub (Sub-Workflow)

**Zweck:** Wiederverwendbarer Sub-Workflow fuer alle 4 Hauptworkflows.
Einmal bauen, ueberall nutzen.

**Konzepte:** Sub-Workflows, Switch Node, Credentials

```
  [Sub-Workflow Trigger]
    Parameter: message (string), channel (string), subject (string)
       |
       v
  [Switch: channel]
       |
       +-- "telegram"  --> [Telegram: Send Message]
       +-- "email"     --> [Gmail: Send Email]
       +-- "slack"     --> [Slack: Post Message]
       +-- "discord"   --> [Discord: Webhook]
       +-- "all"       --> [Alle 4 parallel]
```

### TypeScript-Struktur (Vorschau)

```typescript
@workflow({ name: 'Notification Hub', active: true })
export class NotificationHub {
    @node({ type: '@n8n/n8n-nodes-langchain.manualChatTrigger', ... })
    Trigger = {};  // Sub-Workflow Trigger

    @node({ type: 'n8n-nodes-base.switch', ... })
    ChannelSwitch = { /* channel routing */ };

    @node({ type: 'n8n-nodes-base.telegram', ... })
    TelegramSend = { /* Bot Token + Chat ID */ };

    @node({ type: 'n8n-nodes-base.gmail', ... })
    GmailSend = { /* OAuth */ };

    // ... Slack, Discord

    @links()
    routing() {
        this.Trigger.out(0).to(this.ChannelSwitch.in(0));
        this.ChannelSwitch.out(0).to(this.TelegramSend.in(0));
        this.ChannelSwitch.out(1).to(this.GmailSend.in(0));
        // ...
    }
}
```

### Benoetigte Credentials

| Dienst   | Credential-Typ | Setup                                     |
|----------|---------------|-------------------------------------------|
| Telegram | API Token     | BotFather -> /newbot -> Token kopieren     |
| Gmail    | OAuth2        | Google Cloud Console -> OAuth2 Consent     |
| Slack    | Webhook URL   | Slack App -> Incoming Webhook              |
| Discord  | Webhook URL   | Server-Settings -> Integrations -> Webhook |

---

## WF1: AI News-Kurator

**Lernziele:** Schedule Trigger, HTTP/RSS, OpenAI LLM, Expressions, IF/Filter, Sub-Workflow aufrufen

**Dauer:** ~1-2 Stunden

```
  [Schedule Trigger: taeglich 07:00]
       |
       v
  [RSS Feed 1: Tech] --+
  [RSS Feed 2: AI]   --+--> [Merge: Append]
  [RSS Feed 3: Biz]  --+         |
                                  v
                         [Limit: max 20 Items]
                                  |
                                  v
                         [OpenAI: Fuer jedes Item]
                           Prompt:
                           "Bewerte diesen Artikel (1-10).
                            Erstelle eine 2-Satz Zusammenfassung auf Deutsch.
                            Kategorisiere: Tech/AI/Business/Sonstiges."
                           Output: { score, summary_de, kategorie }
                                  |
                                  v
                         [Filter: score >= 7]
                                  |
                                  v
                         [Code: HTML-Digest formatieren]
                                  |
                                  v
                         [Execute Sub-Workflow: Notification Hub]
                           channel: "email" (oder "all")
```

### Recherche-Befehle

```bash
npx n8nac skills node-info scheduleTrigger
npx n8nac skills node-info rssFeedRead
npx n8nac skills node-info openAi
npx n8nac skills node-info merge
npx n8nac skills node-info filter
npx n8nac skills node-info executeWorkflow
npx n8nac skills examples search "rss ai summary"
```

### Privat-Nutzen
- Morgens einen AI-kuratierten Tech-Newsletter im Postfach
- Nur relevante Artikel (Score >= 7), auf Deutsch zusammengefasst

### Business-Nutzen
- Branchennews automatisch fuer Team aufbereiten
- Wettbewerber-Monitoring mit AI-Bewertung

---

## WF2: AI Email-Assistent

**Lernziele:** Email Trigger, OpenAI Structured Output, Switch (Multi-Routing), Credential Management, Error Handling

**Dauer:** ~2-3 Stunden

```
  [Gmail Trigger: neue Email]
       |
       v
  [OpenAI: Email analysieren]
    Structured Output:
    {
      "kategorie": "support|sales|info|spam|persoenlich",
      "dringlichkeit": "hoch|mittel|niedrig",
      "zusammenfassung": "...",
      "vorgeschlagene_antwort": "...",
      "stichworte": ["..."]
    }
       |
       v
  [Switch: kategorie]
       |
       +-- "support"      --> [Label: Support] --> Sofort-Alert
       +-- "sales"        --> [Label: Sales]   --> Tages-Digest
       +-- "info"         --> [Label: Info]     --> Wochen-Digest
       +-- "spam"         --> [Label: Spam]     --> Archivieren
       +-- "persoenlich"  --> [Label: Personal] --> Sofort-Alert
       |
       v
  [IF: dringlichkeit == "hoch"]
    true  --> [Notification Hub: sofort, channel=telegram]
    false --> [Aggregieren fuer Digest]
       |
       v
  [Error Workflow: bei OpenAI-Fehler benachrichtigen]
```

### Recherche-Befehle

```bash
npx n8nac skills node-info gmail
npx n8nac skills search "gmail trigger new email"
npx n8nac skills node-info openAi
npx n8nac skills node-info switch
npx n8nac skills examples search "email classification ai"
```

### Privat-Nutzen
- Inbox Zero: Nur dringende Emails sofort sehen
- AI schlaegt Antworten vor

### Business-Nutzen
- Support-Tickets automatisch triagieren
- Sales-Leads erkennen und weiterleiten

---

## WF3: AI Personal Agent (Chat-Interface)

**Lernziele:** AI Agent Node, Tools, Memory, Webhook/Chat Trigger, Multi-Step Reasoning, Function Calling

**Dauer:** ~3-4 Stunden

```
  [Chat Trigger / Webhook]
    "Fasse meine letzten Emails zusammen"
    "Was steht morgen im Kalender?"
    "Suche im Web nach X"
    "Berechne 15% MwSt auf 2340 EUR"
       |
       v
  [AI Agent]
    +-- LLM: OpenAI GPT-4o
    +-- Memory: Buffer Window (letzte 10 Nachrichten)
    +-- System Prompt:
    |     "Du bist ein hilfreicher persoenlicher Assistent.
    |      Antworte auf Deutsch. Sei praezise und kurz."
    |
    +-- Tools:
         +-- [Gmail Tool]        Emails lesen/suchen
         +-- [Calendar Tool]     Termine abrufen
         +-- [HTTP Request Tool] Web-Recherche
         +-- [Calculator Tool]   Berechnungen
         +-- [Workflow Tool]     WF1/WF2 aufrufen!
       |
       v
  [Antwort an Chat / Webhook Response]
```

### WICHTIG: AI Sub-Node Syntax

```typescript
// RICHTIG: AI-Nodes mit .uses() verbinden
@links()
routing() {
    this.ChatTrigger.out(0).to(this.AiAgent.in(0));

    this.AiAgent.uses({
        ai_languageModel: this.OpenAiModel.output,
        ai_memory: this.BufferMemory.output,
        ai_tool: [
            this.GmailTool.output,
            this.CalendarTool.output,
            this.HttpTool.output,
            this.CalculatorTool.output,
        ],
    });
}

// FALSCH: .out().to() fuer AI Sub-Nodes -> kaputte Verbindungen!
```

### Recherche-Befehle

```bash
npx n8nac skills node-info agent             # AI Agent
npx n8nac skills node-info lmChatOpenAi      # OpenAI LLM
npx n8nac skills node-info memoryBufferWindow # Memory
npx n8nac skills node-info httpRequestTool    # HTTP Tool
npx n8nac skills search "ai agent tools"
npx n8nac skills examples search "personal assistant telegram"
```

### Privat-Nutzen
- Persoenlicher AI-Butler auf dem Handy (via Telegram)
- "Hey, was habe ich heute vor?" -> Kalender + Emails

### Business-Nutzen
- Team-Assistant-Bot
- Interner Helpdesk-Agent

---

## WF4: AI Dokument-Pipeline

**Lernziele:** Binary Data (PDF), Sub-Workflows, Loop Over Items, Error Workflow, Scheduled Reports, Production-Hardening

**Dauer:** ~3-4 Stunden

### Teil A: Dokument-Eingang

```
  [Email Trigger: Anhang vorhanden]
  [Webhook: manueller PDF-Upload]
       |
       v
  [IF: ist PDF?]
    false --> [Notification: "Kein PDF, uebersprungen"]
    true  --> weiter
       |
       v
  [OpenAI Vision: Dokument-Typ erkennen]
    "Rechnung" / "Vertrag" / "Beleg" / "Sonstiges"
       |
       v
  [OpenAI: Strukturierte Extraktion]
    {
      "typ": "Rechnung",
      "absender": "Firma XY GmbH",
      "empfaenger": "Mein Name",
      "rechnungsnummer": "RE-2026-0042",
      "datum": "2026-03-10",
      "betrag_netto": 1000.00,
      "mwst": 190.00,
      "betrag_brutto": 1190.00,
      "positionen": [
        { "beschreibung": "Beratung", "menge": 8, "einheit": "h", "preis": 125.00 }
      ]
    }
       |
       v
  [Google Sheets: Zeile anfuegen]
    Tabelle: "Rechnungen-2026"
       |
       v
  [Notification Hub: "Neue Rechnung erfasst: RE-2026-0042, 1.190 EUR"]
```

### Teil B: Monats-Report (Sub-Workflow)

```
  [Schedule Trigger: Jeden 1. des Monats]
       |
       v
  [Google Sheets: Alle Eintraege lesen]
       |
       v
  [Filter: Monat = letzter Monat]
       |
       v
  [Code: Aggregation]
    - Summe nach Kategorie
    - Top 5 Ausgaben
    - Vergleich zum Vormonat
       |
       v
  [OpenAI: Analyse & Empfehlungen]
    "Analysiere die Ausgaben. Gibt es Auffaelligkeiten?
     Wo koennte gespart werden?"
       |
       v
  [Code: HTML-Report generieren]
       |
       v
  [Notification Hub: Report senden]
```

### Teil C: Error Workflow

```
  [Error Trigger]
       |
       v
  [Set: Fehler-Details formatieren]
    - Workflow-Name
    - Node-Name
    - Fehlermeldung
    - Zeitstempel
    - Execution-ID (Link zum Debuggen)
       |
       v
  [Notification Hub: channel=telegram, dringend]
```

### Recherche-Befehle

```bash
npx n8nac skills node-info gmail         # Email mit Anhaengen
npx n8nac skills node-info openAi        # Vision + Structured Output
npx n8nac skills node-info googleSheets  # Sheets Operations
npx n8nac skills node-info code          # Custom JS
npx n8nac skills node-info errorTrigger  # Error Handling
npx n8nac skills examples search "invoice pdf extraction"
npx n8nac skills examples search "expense tracking"
```

### Privat-Nutzen
- Rechnungen/Belege automatisch fuer Steuererklaerung erfassen
- Monatlicher Ausgaben-Report mit AI-Analyse

### Business-Nutzen
- Eingangsrechnungen automatisch in Buchhaltung uebernehmen
- Ausgaben-Controlling mit AI-Empfehlungen

---

## Zeitplan

```
  Setup     WF0 + Init        ~1h     n8nac init, Credentials, Notification Hub
     |
  Woche 1   WF1: News-Kurator ~2h     RSS, OpenAI, Filter, Expressions
     |
  Woche 2   WF2: Email-Assist ~3h     Email Trigger, Structured Output, Switch
     |
  Woche 3   WF3: AI Agent     ~4h     Agent Node, Tools, Memory, Chat
     |
  Woche 4   WF4: Dok-Pipeline ~4h     PDF, Vision, Sub-WFs, Error Handling, Reports
```

---

## n8nac CLI Spickzettel

```bash
# Recherche
npx n8nac skills search "thema"              # Suche Nodes/Docs/Templates
npx n8nac skills node-info <node>             # Node-Schema + Docs
npx n8nac skills examples search "thema"      # Community Templates
npx n8nac skills examples download <id>       # Template herunterladen

# Workflow-Management
npx n8nac list                                # Alle Workflows + Status
npx n8nac pull <workflowId>                   # Von n8n herunterladen
npx n8nac push <pfad.workflow.ts>             # Zu n8n hochladen
npx n8nac convert <datei>                     # JSON <-> TypeScript

# Validierung
npx n8nac skills validate <datei>             # Workflow pruefen
npx n8nac skills validate <datei> --strict    # Streng pruefen

# Projekt
npx n8nac init                                # Projekt initialisieren
npx n8nac switch                              # Projekt wechseln
npx n8nac update-ai                           # AI-Kontext aktualisieren
```

---

## Wichtige Regeln (n8n-as-code)

1. **Dateiendung:** Immer `.workflow.ts` (nicht `.ts`)
2. **AI-Nodes:** IMMER `.uses()` statt `.out().to()` fuer LLM/Memory/Tools
3. **Node-Schema:** IMMER `npx n8nac skills node-info` nutzen, nie Parameter raten
4. **Credentials:** Nie im Code, nur per Name/ID referenzieren
5. **Sync-Disziplin:** Pull -> Edit -> Validate -> Push -> Test -> Commit

---

*Plan erstellt am 2026-03-11*
