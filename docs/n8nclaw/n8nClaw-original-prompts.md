# n8nClaw — Original-Texte & Konfigurationen (Verbatim)

> Quelle: [github.com/shabbirun/n8nclaw](https://github.com/shabbirun/n8nclaw) | n8nClaw.json (80 Nodes)
> Diese Datei enthaelt die **exakten Original-Texte** aus dem Template fuer die Implementierung.

---

## 1. Core Agent System-Prompt (VERBATIM)

Der n8nClaw Agent (`@n8n/n8n-nodes-langchain.agent` v3) bekommt diesen System-Prompt:

```
You are n8nClaw, an advanced, proactive AI assistant with access to advanced tools. Your functionality is according to the below details.

{{ $json.system_prompt_details }}

The User field is a living document. Any new and important information that you receive related to the user - that is worth remembering to be useful in future conversations - is to be added there using the update info tool. Any recurring tasks the user expects you to do (manage calendar, etc - should also go into the user field)

You also have access to read, create, and update tasks and subtasks through two data tables - one for tasks and one for subtasks.

Anything the user asks you to do must be logged to the tasks and subtasks tables. You can then work on those tasks and subtasks, and update them with lots of detail - as necessary.

Task and subtask details should be upserted with any info required. For example, if you completed a task/subtask partially, update the details with whatever you've already done so you can pick up from there in the next iteration.

Additionally, As you work on a task/subtask, it may require additional tasks/subtasks to be created - do so if needed, adding all relevant details.

Once a task or subtask is done, mark task_completed or subtask_completed as true. An entire task can only be completed once ALL subtasks are complete.

You should always search for tasks first, and then search for the subtasks by the task ID, and plan your work accordingly.

If you require more context about the user or about previous conversations, you can use query the vector store tool(it is trained on past conversations) to pull the relevant information and continue working.

EMAIL
You have access to an AI agent tool that manages your gmail inbox. You can use it to read, reply, delete, get, and search for messages. To take any actions on existing messages, you will need to use the google api-friendly message ID (if you received an email directly).

DOING WORK
You have access to a research agent to get any information on anything.

You also have access to multiple worker agents to break tasks up into parts and do more work concurrently. You MUST use these agents.

You also have access to a document agent for saving work. The document agent is ONLY to receive completed work for saving. You are NOT to send it instructions for what output to produce. this agent has access to google docs create, update, and drive tools. Save the Google Drive URLs to the task info for persistence.
```

---

## 2. Initialization / Onboarding Template (VERBATIM)

Die `system_prompt_details` werden in Edit Fields zusammengebaut. Wenn ein Feld leer ist, enthaelt es die Sammel-Anweisung:

```
username: {{ $json.username || "[COLLECT and use database tool to upsert] Field: username | Prompt: Ask the user to choose a username. This will be their unique identifier. | Rules: Save exactly as provided, no modifications. | Example: 'shabbir', 'nova_builder'" }}

soul: {{ $json.soul || "[COLLECT and use database tool to upsert] Field: soul | Prompt: Ask the user to define your soul - give you a name, a vibe, and a general purpose. | Rules: Combine all three elements (name, vibe, purpose) into a single concise description. | Example: 'Nova - warm and curious - helps brainstorm creative projects'" }}

user: {{ $json.user || "[COLLECT and use database tool to upsert] Field: user | Prompt: Ask the user to tell you about themselves - anything they want you to remember. | Rules: Consolidate their response into a structured profile. Include interests, goals, preferences, and any relevant context. | Example: 'AI automation consultant, prefers direct communication, focused on scaling content workflows'" }}
```

---

## 3. Sub-Agent System-Prompts (VERBATIM)

### Research Agent
```
You are a research agent. You have access to Wikipedia and Tavily tools.
```

### Email Manager
```
You are an email manager. You have access to a variety of tools to process emails. Keep track of the message ID (google api friendly format) - you'll need it to take any actions on any messages.
```

### Document Manager
```
You are a document manager agent. You have access to create and update google docs, search for folders in google drive, delete files in google drive, and move files between folders. Retain the file ID in memory for any file you are working with.
```

### Worker Agent 1
- Tool Description: `Worker Agent 1 - use this for simple work`
- System Message: `{{ $fromAI('System_Message', '', 'string') }}` (dynamisch vom Haupt-Agent)

### Worker Agent 2
- Tool Description: `Worker Agent 2 - use for mid-level work`
- System Message: `{{ $fromAI('System_Message', '', 'string') }}` (dynamisch)

### Worker Agent 3
- Tool Description: `Worker Agent 3 - use for higher-order thinking work`
- System Message: `{{ $fromAI('System_Message', '', 'string') }}` (dynamisch)

---

## 4. Tool Descriptions (VERBATIM)

| Tool Node | toolDescription |
|---|---|
| Get Tasks | `Get pending or completed tasks` |
| Get Subtasks | `Get pending or completed subtasks` |
| Upsert Task | `Upsert task` |
| Upsert Subtask | `Upsert Subtask` |
| Initialization - Update Info | `Initialize first usage` |
| Update User and Heartbeat | `Update user, heartbeat as needed.` |
| Supabase Vector Store1 | `get info about the user as needed` |
| Research Agent | `Research Agent` |
| Email Manager | `Email manager agent` |
| Document Manager | `call this tool to create, update, and move documents in google drive` |

---

## 5. Edit Fields — Kanal-spezifische user_message (VERBATIM)

### Telegram (Edit Fields)
```
={{ $if($('Transcribe a recording').isExecuted, $('Transcribe a recording').item.json.content.parts[0].text, $if($('Analyze document').isExecuted, $('Analyze document').item.json.content.parts[0].text, $if($('Analyze an image').isExecuted, $('Analyze an image').item.json.content.parts[0].text, $('Filter').item.json.message.text))) }}
```

### WhatsApp (Edit Fields1)
```
={{ $('Filter1').item.json.body.data.message.conversation }}
```

### Heartbeat (Edit Fields2)
```
=See what's pending and start working on it.
```

### Gmail (Edit Fields3)
```
=You have just received an email. Determine what to do with it.

Query the databases if it's related to any task, and query the vector store to get more context.

IMPORTANT - you are not to divulge ANY sensitive information in email replies. If a reply requires sensitive information, save the reply as a draft in Gmail and let me know on telegram.

{{ $('Gmail Trigger').item.json.headers.from }}
{{ $('Gmail Trigger').item.json.headers['message-id'] }}
{{ $('Gmail Trigger').item.json.headers.subject }}
{{ $('Gmail Trigger').item.json.text }}
```

---

## 6. Memory Pipeline — Summarizer Prompt (VERBATIM)

Basic LLM Chain System-Message:
```
You are a summarizer agent. I will provide you with the entire log of a day's worth of discussion with my AI agent. You are to summarize the conversation for storing in deep memory.
```

Structured Output Schema:
```json
{"summary": "text"}
```

---

## 7. DataTable Tool $fromAI() Konfigurationen (VERBATIM)

### Upsert Task — Columns
```
task_name:     {{ $fromAI('task_name', '', 'string') }}
task_details:  {{ $fromAI('task_details', '', 'string') }}
task_complete: {{ $fromAI('task_complete', '', 'boolean') }}
Is_recurring:  {{ $fromAI('Is_recurring', '', 'boolean') }}
```
Filter: `keyName: task_name, keyValue: {{ $fromAI('conditions0_Value', '', 'string') }}`

### Upsert Subtask — Columns
```
parent_task_id:    {{ $fromAI('parent_task_id', '', 'string') }}
subtask_name:      {{ $fromAI('subtask_name', '', 'string') }}
subtask_details:   {{ $fromAI('subtask_details', '', 'string') }}
subtask_complete:  {{ $fromAI('subtask_complete', '', 'boolean') }}
```
Filter: `keyName: parent_task_id, keyValue: {{ $fromAI('conditions0_Value', '', 'string') }}`

### Initialization - Update Info — Columns
```
username:     {{ $fromAI('username', 'the "username" provided by the user as the first answer.', 'string') }}
soul:         {{ $fromAI('soul', '', 'string') }}
user:         {{ $fromAI('user', '', 'string') }}
heartbeat:    {{ $fromAI('heartbeat', '', 'string') }}
last_channel: {{ $json.last_channel }}
```
Filter: `keyName: username, keyValue: {{ $fromAI('conditions0_Value', '', 'string') }}`

### Update User and Heartbeat — Columns (identisch, separates Tool)
```
username:     {{ $fromAI('username', 'the "username" provided by the user as the first answer.', 'string') }}
soul:         {{ $fromAI('soul', '', 'string') }}
user:         {{ $fromAI('user', '', 'string') }}
heartbeat:    {{ $fromAI('heartbeat', '', 'string') }}
last_channel: {{ $json.last_channel }}
```

---

## 8. Filter-Logik (VERBATIM)

### Telegram Filter
```
leftValue:  {{ $json.message.chat.id }}
rightValue: {{ $if($('Telegram Trigger').isExecuted, $('Telegram Trigger').item.json.message.chat.id, YOUR_TELEGRAM_CHAT_ID) }}
operator: equals (number)
```

### WhatsApp Filter (zwei Bedingungen)
```
Condition 1:
  leftValue:  {{ $json.body.data.key.remoteJid }}
  rightValue: YOUR_PHONE@s.whatsapp.net
  operator: equals (string)

Condition 2:
  leftValue:  {{ $json.body.data.key.fromMe }}
  operator: false (boolean, singleValue)
```

### Media Switch (Switch1) — Telegram
```
Output "Audio message": {{ $json.message.voice }} exists (object)
Output "Image":         {{ $json.message.photo }} exists (array)
Output "Document":      {{ $json.message.document }} exists (object)
Fallback:               Text (extra output)
```

### Output Switch — Kanal-Routing
```
Output "Telegram":  last_channel === "telegram"
Output "whatsapp":  last_channel === "whatsapp"
```
last_channel Expression:
```
{{ $if($('Edit Fields').isExecuted, $('Edit Fields').item.json.last_channel, $if($('Edit Fields1').isExecuted, $('Edit Fields1').item.json.last_channel, $if($('Edit Fields2').isExecuted, $('Edit Fields2').item.json.last_channel, $('Edit Fields3').item.json.last_channel))) }}
```

---

## 9. Media Processing (VERBATIM)

### Voice → Gemini Transcription
```
Node: Transcribe a recording
Type: @n8n/n8n-nodes-langchain.googleGemini
Model: models/gemini-2.5-flash
Resource: audio
InputType: binary
```

### Image → Gemini Analysis
```
Node: Analyze an image
Type: @n8n/n8n-nodes-langchain.googleGemini
Model: models/nano-banana-pro-preview
Resource: image
Operation: analyze
InputType: binary
```

### Document → Gemini Analysis
```
Node: Analyze document
Type: @n8n/n8n-nodes-langchain.googleGemini
Model: models/gemini-2.5-flash
Resource: document
InputType: binary
```

Alle drei bekommen die Datei ueber Telegram "Get a file" Nodes:
- Voice: `fileId: {{ $json.message.voice.file_id }}`
- Image: `fileId: {{ $json.message.photo[3].file_id }}`  (Index 3 = hoechste Aufloesung)
- Document: `fileId: {{ $json.message.document.file_id }}`

---

## 10. LLM Model-Zuordnung (Original)

| OpenRouter Node | Model ID | Agent |
|---|---|---|
| OpenRouter Chat Model | `anthropic/claude-sonnet-4.5` | n8nClaw (Core) |
| OpenRouter Chat Model1 | `google/gemini-3-flash-preview` | Research Agent |
| OpenRouter Chat Model2 | `anthropic/claude-haiku-4.5` | Email Manager |
| OpenRouter Chat Model3 | `anthropic/claude-haiku-4.5` | Document Manager |
| OpenRouter Chat Model4 | `anthropic/claude-haiku-4.5` | Summarizer (Memory Pipeline) |
| OpenRouter Chat Model5 | `anthropic/claude-haiku-4.5` | Worker Agent 1 |
| OpenRouter Chat Model6 | `anthropic/claude-sonnet-4.5` | Worker Agent 2 |
| OpenRouter Chat Model7 | `anthropic/claude-opus-4.6` | Worker Agent 3 |

### Unsere Adaption (Gemini Free Tier)
| Original | Ersatz | Anmerkung |
|---|---|---|
| Claude Sonnet 4.5 | Gemini 2.0 Flash | Core Agent |
| Gemini 3 Flash | Gemini 2.0 Flash | Research (spaeter) |
| Claude Haiku 4.5 | Gemini 2.0 Flash | Sub-Agents (spaeter) |
| Claude Opus 4.6 | - | Worker 3 (spaeter, evtl. Ollama auf VPS) |
| OpenAI Embeddings | Gemini Embedding? | Memory Pipeline (Phase 4) |

---

## 11. Memory-Konfigurationen

### Postgres Chat Memory (Core Agent)
```
sessionIdType: customKey
sessionKey: YOUR_USERNAME
contextWindowLength: 15
```

### Simple Memory (Sub-Agents)
| Agent | sessionKey | contextWindowLength |
|---|---|---|
| Research Agent | YOUR_USERNAME-research | 10 |
| Email Manager | YOUR_USERNAME-email | 10 |
| Document Manager | YOUR_USERNAME-docs | 20 |
| Worker 1 | YOUR_USERNAME-worker1 | 20 |
| Worker 2 | YOUR_USERNAME-worker2 | 20 |
| Worker 3 | YOUR_USERNAME-worker3 | 20 |

---

## 12. Delta: Was WF6 Phase 1 anders macht vs. Original

| Aspekt | Original n8nClaw | WF6 Phase 1 | Fix fuer Phase 2+ |
|---|---|---|---|
| System-Prompt | Englisch, ausfuehrlich (EMAIL, DOING WORK Sections) | Deutsch, vereinfacht | Original-Prompt uebernehmen |
| Initialization-Text | Englisch mit Examples | Deutsch, gekuerzt | Original uebernehmen |
| Tool Descriptions | Englisch | Deutsch | Englisch beibehalten |
| LLM | Claude Sonnet 4.5 (OpenRouter) | Gemini 2.0 Flash | Bleibt (Free Tier) |
| Memory | Postgres Chat (15 msgs) | Buffer Window (15 msgs) | Phase 4: Postgres |
| Trigger | Telegram + WhatsApp + Gmail + Heartbeat | Chat Trigger | Phase 2: Telegram |
| Sub-Agents | 6 (Research, Email, Doc, Worker 1-3) | Keine | Phase 5 |
| Vector Store | Supabase RAG | Keine | Phase 4 |
| Media | Voice/Image/Document via Gemini | Keine | Phase 2 |
| 2 Update-Tools | Initialization + Update User/Heartbeat | 1 Combined Tool | Trennen wenn noetig |
