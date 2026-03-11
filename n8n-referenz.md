# n8n Referenzdokument
> Umfassende Referenz basierend auf der offiziellen Dokumentation (docs.n8n.io)
> Version: n8n 2.11.2 | Stand: 2026-03-11

---

## Inhaltsverzeichnis

1. [Was ist n8n?](#1-was-ist-n8n)
2. [Architektur](#2-architektur)
3. [Kernkonzepte](#3-kernkonzepte)
4. [Nodes im Detail](#4-nodes-im-detail)
5. [Datenmodell & Datenfluss](#5-datenmodell--datenfluss)
6. [Expressions & Built-in Variablen](#6-expressions--built-in-variablen)
7. [Flow-Logik](#7-flow-logik)
8. [Error Handling](#8-error-handling)
9. [AI & LLM Features](#9-ai--llm-features)
10. [Integrationen & Credentials](#10-integrationen--credentials)
11. [Self-Hosting & Konfiguration](#11-self-hosting--konfiguration)
12. [API](#12-api)
13. [Best Practices](#13-best-practices)
14. [Lernpfad](#14-lernpfad)

---

## 1. Was ist n8n?

n8n ("nodemation") ist eine **Open-Source Workflow-Automatisierungsplattform** mit 500+ Integrationen und nativen AI-Funktionen. Vergleichbar mit Zapier/Make, aber:

| Eigenschaft       | n8n (Self-Hosted)      | Zapier / Make          |
|--------------------|------------------------|------------------------|
| **Kosten**         | Kostenlos, unlimitiert | Pro Task abgerechnet   |
| **Datenhaltung**   | Lokal (DSGVO-konform)  | US-Cloud               |
| **Code-Zugang**    | JS/Python Code-Nodes   | Eingeschraenkt         |
| **AI-Integration** | Native LangChain-Nodes | Begrenzt               |
| **Anpassbarkeit**  | Community Nodes, API   | Marketplace            |

---

## 2. Architektur

### System-Architektur

```
  Browser (Editor UI)
        |
        v
  +-----+---------+
  |  n8n Server    |
  |                |
  |  +----------+  |     +------------------+
  |  | Workflow  |  |     |  Externe APIs    |
  |  | Engine    +--+---->|  (500+ Services) |
  |  +----------+  |     +------------------+
  |                |
  |  +----------+  |     +------------------+
  |  | Trigger   |  |     |  Webhooks /      |
  |  | Manager   +--+---->|  Cron Jobs       |
  |  +----------+  |     +------------------+
  |                |
  |  +----------+  |     +------------------+
  |  | Credential| |     |  OAuth / API     |
  |  | Manager   +-+---->|  Keys (AES-256)  |
  |  +----------+  |     +------------------+
  |                |
  +-------+--------+
          |
          v
  +-------+--------+
  |  SQLite oder    |
  |  PostgreSQL     |
  |  (Workflows,    |
  |   Executions,   |
  |   Credentials)  |
  +----------------+
```

### Skalierung (Enterprise / Queue Mode)

```
                        +-- [Worker 1]
  [Main Instance] --+   |
        |           |   +-- [Worker 2]
        v           |   |
  [Redis Queue] ----+   +-- [Worker N]
        |
        v
  [PostgreSQL]    <-- Shared DB
```

---

## 3. Kernkonzepte

### 3.1 Workflows

Ein Workflow ist eine Kette verbundener Nodes, die Daten verarbeiten.

```
 [Trigger] --> [Verarbeitung] --> [Aktion]
                    |
                    +--> [Verzweigung] --> [Aktion B]
```

**Lebenszyklus eines Workflows:**

```
  Erstellen --> Speichern --> Testen --> Aktivieren --> Ueberwachen
     |                         |            |              |
     +-- Editor UI        Manuell      Produktion    Executions-
                          ausfuehren   Trigger aktiv  Liste
```

**Workflow-Einstellungen:**

| Einstellung                    | Beschreibung                              |
|-------------------------------|-------------------------------------------|
| Error Workflow                | Benachrichtigung bei Fehlern               |
| Timeout Workflow              | Max. Laufzeit begrenzen                    |
| Execution Order               | Reihenfolge der Node-Ausfuehrung           |
| Save Failed Executions        | Fehlgeschlagene Runs loggen                |
| Save Successful Executions    | Erfolgreiche Runs loggen                   |
| Timezone                      | Workflow-spezifische Zeitzone               |

### 3.2 Executions

```
  Execution-Typen
  |
  +-- Manual       Zum Testen waehrend der Entwicklung
  +-- Partial      Nur bestimmte Nodes ausfuehren
  +-- Production   Live-Trigger im aktivierten Workflow
```

**Debugging-Werkzeuge:**
- **Pin Data**: Node-Output "einfrieren" fuer konsistentes Testen
- **Mock Data**: Synthetische Testdaten statt Live-API
- **Step-by-step**: Jeden Node einzeln inspizieren (Input/Output)
- **Re-run**: Vergangene Executions erneut ausfuehren

### 3.3 Tags & Organisation

- **Tags**: Workflows kategorisieren (z.B. "Marketing", "Buchhaltung")
- **Export/Import**: JSON-basiert, portabel
- **Templates**: Vorgefertigte Workflows als Startpunkt
- **Workflow History**: Versionen nachverfolgen

---

## 4. Nodes im Detail

### Node-Kategorien

```
  +------------------+     +------------------+     +------------------+
  |  TRIGGER NODES   |     |   CORE NODES     |     |  ACTION NODES    |
  |                  |     |                  |     |                  |
  |  Starten den     |     |  Daten-          |     |  Externe         |
  |  Workflow        |     |  verarbeitung    |     |  Services        |
  |                  |     |  & Logik         |     |  ansprechen      |
  +------------------+     +------------------+     +------------------+
         |                        |                        |
    Manual Trigger           Set / Edit Fields         Gmail Send
    Schedule Trigger         IF / Switch               Slack Message
    Webhook                  Merge / Split             HTTP Request
    Email (IMAP)             Code (JS/Python)          Google Sheets
    App-Trigger              Filter                    Airtable
    (Gmail, Slack...)        Loop Over Items           Telegram
                             Aggregate                 500+ weitere
                             Wait
```

### Wichtigste Core Nodes

| Node              | Funktion                                              | Typischer Einsatz                  |
|-------------------|-------------------------------------------------------|-------------------------------------|
| **Manual Trigger**| Workflow per Klick starten                             | Testen & Entwicklung                |
| **Schedule Trigger** | Zeitgesteuerter Start (Cron)                       | Taegliche Reports, Monitoring       |
| **Webhook**       | HTTP-Endpunkt empfangen                                | Formular-Daten, API-Callbacks       |
| **HTTP Request**  | Beliebige API aufrufen                                 | REST APIs, Web Scraping             |
| **Set / Edit Fields** | Felder setzen/umbenennen                          | Daten transformieren                |
| **IF**            | Bedingung pruefen (true/false)                         | Verzweigungen                       |
| **Switch**        | Mehrere Faelle pruefen                                 | Multi-Path Routing                  |
| **Merge**         | Datenstroeme zusammenfuehren                           | Parallele Branches vereinen         |
| **Split Out**     | Daten auf Branches verteilen                           | Parallelverarbeitung                |
| **Code**          | JavaScript oder Python ausfuehren                      | Komplexe Logik                      |
| **Filter**        | Items nach Kriterien filtern                           | Nur relevante Daten weiterleiten    |
| **Loop Over Items** | Batch-Verarbeitung                                  | Grosse Datensaetze stueckweise      |
| **Wait**          | Ausfuehrung pausieren                                  | Rate Limiting, Human-in-the-Loop    |
| **Execute Sub-workflow** | Anderen Workflow aufrufen                       | Modularisierung                     |

### AI / Cluster Nodes (LangChain-basiert)

```
                          +-- [Memory Node]
                          |
  [Chat Trigger] -> [AI Agent] -+-- [LLM Model]
                          |
                          +-- [Tool Node(s)]
                          |
                          +-- [Output Parser]
```

| Node                | Funktion                              |
|---------------------|---------------------------------------|
| **AI Agent**        | Orchestriert LLM + Tools              |
| **Basic LLM Chain** | Einfache LLM-Interaktion             |
| **Q&A Chain**       | RAG-basierte Dokumenten-Abfrage       |
| **Summarization**   | Text zusammenfassen                   |
| **Text Classifier** | Dokumente kategorisieren              |
| **Information Extractor** | Strukturierte Daten aus Text    |
| **AI Transform**    | AI-gestuetzte Datentransformation     |

---

## 5. Datenmodell & Datenfluss

### Item-Struktur

n8n verarbeitet Daten als **Items** -- jedes Item enthaelt JSON und optionale Binaerdaten:

```json
{
  "json": {
    "name": "Max Mustermann",
    "email": "max@firma.de",
    "betrag": 42.50,
    "adresse": {
      "stadt": "Berlin",
      "plz": "10115"
    }
  },
  "binary": {
    "anhang": {
      "fileName": "rechnung.pdf",
      "mimeType": "application/pdf",
      "data": "base64..."
    }
  }
}
```

### Datenfluss zwischen Nodes

```
  Node A                    Node B                    Node C
  +--------+               +--------+               +--------+
  | Output |  Items[]      | Input  |  Items[]      | Input  |
  | [item1]| ----------->  | [item1]| ----------->  | [item1]|
  | [item2]|               | [item2]|               | [item2]|
  | [item3]|               | [item3]|               | [item3]|
  +--------+               +--------+               +--------+
```

**Wichtig:** Jeder Node bekommt ein Array von Items und gibt ein Array von Items zurueck.

### Daten-Zugriffsmuster

```
  Im aktuellen Node:
    {{ $json.fieldName }}           Aktuelles Item
    {{ $json.nested.key }}          Verschachteltes Feld
    {{ $input.all() }}              Alle Input-Items
    {{ $input.first() }}            Erstes Item
    {{ $input.last() }}             Letztes Item

  Von anderen Nodes:
    {{ $node["NodeName"].json }}    Bestimmter Node
    {{ $("NodeName").all() }}       Alle Items eines Nodes

  Workflow-Kontext:
    {{ $workflow.id }}              Workflow-ID
    {{ $workflow.name }}            Workflow-Name
    {{ $execution.id }}            Execution-ID
    {{ $env.MY_VAR }}              Umgebungsvariable
    {{ $now }}                     Aktueller Zeitstempel (Luxon)
    {{ $today }}                   Heutiges Datum (Luxon)
```

### Data Mapping

```
  Methode 1: Drag & Drop im Editor (visuell)

  Methode 2: Expressions
    {{ $json.email }}
    {{ $json.name.toUpperCase() }}
    {{ $json.betrag * 1.19 }}

  Methode 3: Code Node (JS/Python)
    const items = $input.all();
    return items.map(item => ({
      json: {
        ...item.json,
        fullName: `${item.json.vorname} ${item.json.nachname}`
      }
    }));
```

---

## 6. Expressions & Built-in Variablen

### Syntax

Expressions stehen immer in doppelten geschweiften Klammern: `{{ ausdruck }}`

### Alle Built-in Variablen

| Variable       | Typ          | Beschreibung                              | Beispiel                           |
|---------------|--------------|-------------------------------------------|------------------------------------|
| `$json`       | Object       | JSON des aktuellen Items                  | `{{ $json.email }}`                |
| `$input`      | Object       | Input-Daten des aktuellen Nodes           | `{{ $input.all() }}`               |
| `$binary`     | Object       | Binaerdaten des aktuellen Items           | `{{ $binary.data.fileName }}`      |
| `$node`       | Object       | Zugriff auf benannte Nodes                | `{{ $node["HTTP"].json }}`         |
| `$workflow`   | Object       | Workflow-Metadaten                        | `{{ $workflow.name }}`             |
| `$execution`  | Object       | Execution-Kontext                         | `{{ $execution.id }}`              |
| `$env`        | Object       | Umgebungsvariablen                        | `{{ $env.API_KEY }}`               |
| `$vars`       | Object       | Benutzerdefinierte Variablen              | `{{ $vars.baseUrl }}`              |
| `$now`        | DateTime     | Aktueller Zeitpunkt (Luxon)               | `{{ $now.toISO() }}`               |
| `$today`      | DateTime     | Heute 00:00 (Luxon)                       | `{{ $today.plus({days: 7}) }}`     |
| `$runIndex`   | Number       | Aktueller Loop-Index                      | `{{ $runIndex }}`                  |
| `$prevNode`   | Object       | Vorheriger Node-Metadaten                 | `{{ $prevNode.name }}`             |
| `$parameter`  | Object       | Parameter des aktuellen Nodes             | `{{ $parameter.resource }}`        |

### Haeufige Expression-Patterns

```
  Strings:
    {{ $json.name.toLowerCase() }}
    {{ $json.text.includes("wichtig") }}
    {{ $json.email.split("@")[1] }}
    {{ `Hallo ${$json.vorname}!` }}

  Zahlen:
    {{ $json.preis * 1.19 }}
    {{ Math.round($json.betrag * 100) / 100 }}
    {{ $json.werte.reduce((sum, v) => sum + v, 0) }}

  Arrays:
    {{ $json.items.length }}
    {{ $json.items.filter(i => i.aktiv) }}
    {{ $json.items.map(i => i.name).join(", ") }}

  Datum/Zeit (Luxon):
    {{ $now.toFormat("dd.MM.yyyy") }}
    {{ $now.minus({hours: 2}).toISO() }}
    {{ $today.plus({days: 30}).toFormat("yyyy-MM-dd") }}
    {{ DateTime.fromISO($json.datum).toRelative() }}

  Bedingungen:
    {{ $json.betrag > 1000 ? "Hoch" : "Normal" }}
    {{ $json.status === "aktiv" }}
    {{ $json.tags?.includes("vip") ?? false }}

  JMESPath (komplexe JSON-Queries):
    {{ $jmespath($json, "items[?preis > `100`].name") }}
```

---

## 7. Flow-Logik

### Bedingte Verzweigungen

```
  IF-Node (binaer):

                      true   +-- [Email senden]
  [Daten] --> [IF] ---+
                      false  +-- [Log schreiben]

  Bedingung: {{ $json.betrag > 1000 }}


  Switch-Node (multi):

                      Fall 1: "dringend"   +-- [Sofort-Alert]
                      |
  [Daten] --> [Switch] -- Fall 2: "normal" +-- [Tages-Report]
                      |
                      Fall 3: "niedrig"    +-- [Archivieren]
                      |
                      Default              +-- [Ignorieren]
```

### Daten zusammenfuehren (Merge)

```
  [API Call A] --+
                 +--> [Merge] --> [Weiterverarbeitung]
  [API Call B] --+

  Merge-Modi:
    - Append:    Alle Items aneinanderhaengen
    - Keep Key Matches:  Inner Join (nur Matches)
    - Combine:   Items paarweise zusammenfuegen
    - Choose Branch:     Nur einen Branch verwenden
```

### Schleifen (Loops)

```
  [100 Items] --> [Loop Over Items] --> [API Call] --> [Zurueck zum Loop]
                   Batch Size: 10        |
                                         +-- 10 Items pro Durchlauf
                                             (Rate Limiting!)
```

- **Loop Over Items**: Batch-Verarbeitung mit konfigurierbarer Groesse
- **Loop until**: Wiederholen bis Bedingung erfuellt
- Noetig bei API-Rate-Limits oder grossen Datensaetzen

### Sub-Workflows

```
  [Haupt-Workflow]
       |
       v
  [Execute Sub-workflow] ----> [Sub-Workflow]
       |                           |
       v                    [Sub-Workflow Trigger]
  [Weiter...]                     |
                            [Verarbeitung]
                                  |
                            [Daten zurueck]
```

- Modularisierung: Wiederverwendbare Logik auslagern
- Daten fliessen hin und zurueck
- Fehler propagieren zum Haupt-Workflow

### Wait-Node

```
  [Aktion] --> [Wait] --> [Folge-Aktion]
                 |
                 +-- Zeitbasiert: "5 Minuten warten"
                 +-- Webhook: "Auf Bestaetigung warten" (Human-in-the-Loop)
                 +-- Bestimmte Zeit: "Am 15.03. um 09:00"
```

---

## 8. Error Handling

### Error-Workflow-Pattern

```
  [Produktions-Workflow]
         |
         | Fehler tritt auf
         v
  [Error Trigger Node] --> [Error Workflow]
         |                      |
         v                      v
  Fehler-Details:          [Slack-Alert]
  - Workflow-Name          [Email senden]
  - Node-Name              [Ticket erstellen]
  - Fehlermeldung          [Log schreiben]
  - Zeitstempel
  - Execution-ID
```

### Error-Handling-Optionen pro Node

| Option            | Beschreibung                                      |
|-------------------|---------------------------------------------------|
| **Retry on Fail** | Automatisch X-mal wiederholen mit Wartezeit        |
| **Continue on Fail** | Fehler ignorieren, weiter zum naechsten Node   |
| **Stop And Error** | Workflow bewusst abbrechen (z.B. Validierung)     |
| **Error Workflow** | Separaten Workflow bei Fehler triggern             |

### Best Practice: Error Handling einrichten

```
  1. Error Workflow erstellen:
     [Error Trigger] --> [Set: Details formatieren] --> [Slack/Email]

  2. In jedem Produktions-Workflow:
     Settings --> Error Workflow --> Auswahl

  3. Kritische Nodes:
     Retry on Fail: 3 Versuche, 1000ms Wartezeit

  4. Nicht-kritische Nodes:
     Continue on Fail: true (z.B. optionale Benachrichtigungen)
```

---

## 9. AI & LLM Features

### Unterstuetzte LLM-Provider

| Provider         | Nodes                       | Lokal moeglich? |
|------------------|-----------------------------|-----------------|
| **Ollama**       | Chat, Embeddings            | Ja (kostenlos)  |
| **OpenAI**       | GPT-4o, Embeddings, DALL-E  | Nein (API-Key)  |
| **Anthropic**    | Claude                      | Nein (API-Key)  |
| **Google Gemini**| Chat, Embeddings            | Nein (API-Key)  |
| **Mistral**      | Chat, Embeddings            | Nein (API-Key)  |
| **AWS Bedrock**  | Div. Modelle                | Nein (AWS)      |
| **DeepSeek**     | Chat                        | Nein (API-Key)  |
| **xAI Grok**     | Chat                        | Nein (API-Key)  |

### AI Agent Architektur

```
  +----------------------------------------------------------+
  |                      AI Agent Node                        |
  |                                                          |
  |  +-------------+    +----------+    +----------------+   |
  |  | LLM Model   |    | Memory   |    | Output Parser  |   |
  |  | (Ollama,    |    | (Buffer, |    | (Structured,   |   |
  |  |  OpenAI...) |    |  Redis,  |    |  Auto-fix,     |   |
  |  |             |    |  Postgres)|   |  Item List)    |   |
  |  +-------------+    +----------+    +----------------+   |
  |                                                          |
  |  Tools:                                                  |
  |  +----------+ +----------+ +----------+ +----------+    |
  |  |Calculator| |Wikipedia | |HTTP Req. | |Workflow  |    |
  |  |          | |          | |(API Call)| |Tool      |    |
  |  +----------+ +----------+ +----------+ +----------+    |
  +----------------------------------------------------------+
```

### Agent-Typen

| Agent                   | Einsatz                                    |
|-------------------------|--------------------------------------------|
| **Tools Agent**         | Allgemein, nutzt Tools nach Bedarf          |
| **Conversational**      | Dialog/Chat mit Kontext                     |
| **ReAct**               | Reasoning + Acting (Schritt fuer Schritt)   |
| **Plan and Execute**    | Mehrstufige Aufgaben mit Planung            |
| **SQL Agent**           | Datenbank-Queries generieren                |
| **OpenAI Functions**    | OpenAI Function Calling                     |

### RAG-Pattern (Retrieval Augmented Generation)

```
  Indexierung:
  [Dokumente] --> [Text Splitter] --> [Embeddings] --> [Vector Store]
                                       (Ollama)       (Qdrant/Chroma)

  Abfrage:
  [Frage] --> [Embeddings] --> [Vector Store Retriever] --> [LLM] --> [Antwort]
                                      |
                                Relevante Chunks
```

### Vector Store Optionen

| Vector Store      | Self-Hosted | Kostenlos |
|-------------------|-------------|-----------|
| **Qdrant**        | Ja (Docker) | Ja        |
| **ChromaDB**      | Ja (Docker) | Ja        |
| **PGVector**      | Ja (Postgres-Extension) | Ja |
| **Simple (In-Memory)** | Ja    | Ja        |
| Pinecone          | Nein        | Free Tier |
| Weaviate          | Ja (Docker) | Ja        |

---

## 10. Integrationen & Credentials

### Top-Integrationen nach Kategorie

```
  +------------------+------------------+------------------+
  |   Kommunikation  |   Cloud Storage  |   Datenbanken    |
  |                  |                  |                  |
  |   Gmail          |   Google Drive   |   PostgreSQL     |
  |   Slack          |   Dropbox        |   MySQL          |
  |   Teams          |   OneDrive       |   MongoDB        |
  |   Telegram       |   AWS S3         |   SQLite         |
  |   Discord        |   Azure Blob     |   Redis          |
  +------------------+------------------+------------------+
  |   CRM / Business |   DevOps         |   Sonstiges      |
  |                  |                  |                  |
  |   Airtable       |   GitHub         |   HTTP Request   |
  |   Notion         |   GitLab         |   RSS Feed       |
  |   HubSpot        |   Jenkins        |   MQTT           |
  |   Salesforce     |   Docker         |   FTP/SFTP       |
  |   Monday.com     |   Netlify        |   GraphQL        |
  +------------------+------------------+------------------+
```

### Credentials-System

```
  Credential-Typen:
  +-- OAuth2         (Gmail, Google Drive, Slack, GitHub...)
  +-- API Key        (OpenAI, Telegram, Airtable...)
  +-- Basic Auth     (HTTP-basierte Dienste)
  +-- Service Account (Google Cloud, AWS...)
  +-- Custom Auth    (Eigene Header, Tokens)
```

**Verwaltung:**
- Zentral gespeichert, AES-256 verschluesselt
- Einmal einrichten, in allen Workflows nutzen
- Sharing: Team-basierte Zugriffskontrolle
- Environment Variables fuer Self-Hosted Deployments

---

## 11. Self-Hosting & Konfiguration

### Installation

```
  Option A: npm (aktuell aktiv)
  $ npm install n8n -g
  $ n8n start
  --> http://localhost:5678

  Option B: Docker (empfohlen fuer Produktion)
  $ docker run -d --name n8n \
      -p 5678:5678 \
      -v n8n_data:/home/node/.n8n \
      n8nio/n8n

  Option C: Docker Compose (mit PostgreSQL)
  --> docker-compose.yml mit n8n + postgres Services
```

### Wichtige Umgebungsvariablen

| Variable                          | Beschreibung                    | Default            |
|-----------------------------------|---------------------------------|--------------------|
| `N8N_PORT`                        | Server-Port                     | 5678               |
| `N8N_PROTOCOL`                    | http oder https                 | http               |
| `N8N_HOST`                        | Hostname                        | localhost          |
| `GENERIC_TIMEZONE`                | Zeitzone                        | America/New_York   |
| `N8N_ENCRYPTION_KEY`              | Credential-Verschluesselung     | auto-generated     |
| `DB_TYPE`                         | Datenbank (sqlite/postgresdb)   | sqlite             |
| `N8N_BASIC_AUTH_ACTIVE`           | Basic Auth aktivieren           | false              |
| `EXECUTIONS_DATA_SAVE_ON_ERROR`   | Fehler-Executions speichern     | all                |
| `EXECUTIONS_DATA_SAVE_ON_SUCCESS` | Erfolgs-Executions speichern    | all                |

### Datenbank-Optionen

| DB          | Empfehlung                                          |
|-------------|-----------------------------------------------------|
| **SQLite**  | Entwicklung, persoenlicher Gebrauch, <100 Workflows |
| **PostgreSQL** | Produktion, Teams, Skalierung                    |

### Sicherheit

- Custom Encryption Key setzen (`N8N_ENCRYPTION_KEY`)
- OAuth statt Passwoerter bevorzugen
- 2FA fuer User-Accounts aktivieren
- RBAC mit Least-Privilege-Prinzip
- Regelmaessige Credential-Audits

---

## 12. API

### n8n REST API

```
  Base URL: http://localhost:5678/api/v1

  Authentifizierung:
    Header: X-N8N-API-KEY: <dein-api-key>

  Endpoints:
    GET    /workflows              Alle Workflows auflisten
    POST   /workflows              Workflow erstellen
    GET    /workflows/:id          Workflow abrufen
    PUT    /workflows/:id          Workflow aktualisieren
    DELETE /workflows/:id          Workflow loeschen
    POST   /workflows/:id/activate Workflow aktivieren

    GET    /executions             Alle Executions
    GET    /executions/:id         Execution-Details
    DELETE /executions/:id         Execution loeschen

    GET    /credentials            Credentials auflisten
```

### API-Key erstellen

```
  n8n UI --> Settings --> API --> Create API Key
```

---

## 13. Best Practices

### Workflow-Design

```
  +------------------------------------------------------------------+
  |                    Workflow Design Checkliste                      |
  |                                                                  |
  |  [ ] Sticky Notes fuer Dokumentation nutzen                       |
  |  [ ] Error Workflow einrichten                                    |
  |  [ ] Tags zur Kategorisierung vergeben                            |
  |  [ ] Erst manuell testen, dann aktivieren                        |
  |  [ ] Pin Data waehrend Entwicklung verwenden                      |
  |  [ ] Sub-Workflows fuer wiederverwendbare Logik                   |
  |  [ ] Grosse Datensaetze mit Loop Over Items batchen               |
  |  [ ] Timeouts konfigurieren                                      |
  |  [ ] Nicht alle erfolgreichen Executions speichern (Performance) |
  |  [ ] Credentials per OAuth statt API Key wo moeglich              |
  +------------------------------------------------------------------+
```

### DSGVO / Datenschutz (Mittelstand)

```
  Self-Hosted = alle Daten bleiben auf deiner Maschine

  +-- Keine Daten verlassen Deutschland/EU
  +-- Volle Kontrolle ueber Speicherung und Loeschung
  +-- Credentials lokal verschluesselt (AES-256)
  +-- Audit-Log ueber Executions verfuegbar
  +-- Kein US-Cloud-Anbieter in der Datenkette
```

---

## 14. Lernpfad

### Offizielle Kurse

| Kurs     | Dauer  | Inhalt                                              |
|----------|--------|-----------------------------------------------------|
| Level 1  | ~2h    | Editor-UI, erster Workflow, Scheduling, Notifications|
| Level 2  | ~2h    | Datentypen, Merge/Split, Error Handling, Praxis      |

### Empfohlene Progression

```
  Woche 1:  Level-1-Kurs + einfache Workflows (Trigger, Set, Email)
       |
  Woche 2:  HTTP Request, IF/Switch, Webhooks
       |
  Woche 3:  Level-2-Kurs + Merge, Loop, Error Handling
       |
  Woche 4:  AI/LLM Nodes + Ollama lokal
       |
  Woche 5:  Sub-Workflows, Produktions-Hardening
       |
  Woche 6:  RAG, Agents, komplexe Pipelines
```

---

## Anhang: Schnellreferenz-Karte

```
  TRIGGER          VERARBEITUNG         AKTION            LOGIK
  -----------      ---------------      ---------         --------
  Manual           Set/Edit Fields      HTTP Request      IF
  Schedule         Code (JS/Python)     Gmail Send        Switch
  Webhook          Filter               Slack Message     Merge
  Email (IMAP)     Aggregate            Telegram Send     Split Out
  App-Trigger      Remove Duplicates    Google Sheets     Loop
                   Rename Keys          Airtable          Wait
                   Sort                 Execute Command   Sub-Workflow
                   Compare Datasets     FTP/SFTP          Stop & Error

  EXPRESSIONS                          AI NODES
  ---------------                      ---------------
  {{ $json.feld }}                     AI Agent
  {{ $input.all() }}                   Basic LLM Chain
  {{ $node["Name"].json }}             Q&A Chain
  {{ $now.toFormat("dd.MM.yyyy") }}    Text Classifier
  {{ $env.MY_VAR }}                    Information Extractor
  {{ $execution.id }}                  Vector Store
  {{ $workflow.name }}                 Embeddings
  {{ $jmespath($json, "query") }}      Memory Nodes
```

---

*Erstellt am 2026-03-11 | Basierend auf docs.n8n.io | n8n v2.11.2*
