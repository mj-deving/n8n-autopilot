import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : WF6 - AI Personal Assistant
// Nodes   : 26  |  Connections: 19
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ChatTrigger                        chatTrigger
// TelegramTrigger                    telegramTrigger            [creds]
// Filter                             filter
// MediaSwitch                        switch
// GetVoiceFile                       telegram                   [creds]
// GetImageFile                       telegram                   [creds]
// GetDocumentFile                    telegram                   [creds]
// TranscribeVoice                    googleGemini               [creds]
// AnalyzeImage                       googleGemini               [creds]
// AnalyzeDocument                    googleGemini               [creds]
// GetInitProfile                     dataTable
// EditFieldsTg                       set
// GetInitProfileChat                 dataTable
// EditFieldsChat                     set
// SendTelegram                       telegram                   [creds]
// OutputSwitch                       switch
// ClawAgent                          agent                      [AI]
// GeminiFlash                        lmChatGoogleGemini         [creds] [ai_languageModel]
// ChatMemory                         memoryBufferWindow         [ai_memory]
// DenkTool                           toolCode                   [ai_tool]
// Datumzeit                          toolCode                   [ai_tool]
// GetTasks                           dataTableTool              [ai_tool]
// UpsertTask                         dataTableTool              [ai_tool]
// GetSubtasks                        dataTableTool              [ai_tool]
// UpsertSubtask                      dataTableTool              [ai_tool]
// UpdateUserInfo                     dataTableTool              [ai_tool]
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ChatTrigger
//    → GetInitProfileChat
//      → EditFieldsChat
//        → ClawAgent
//          → OutputSwitch
//            → SendTelegram
// TelegramTrigger
//    → Filter
//      → MediaSwitch
//        → GetVoiceFile
//          → TranscribeVoice
//            → GetInitProfile
//              → EditFieldsTg
//                → ClawAgent (↩ loop)
//       .out(1) → GetImageFile
//          → AnalyzeImage
//            → GetInitProfile (↩ loop)
//       .out(2) → GetDocumentFile
//          → AnalyzeDocument
//            → GetInitProfile (↩ loop)
//       .out(3) → GetInitProfile (↩ loop)
//
// AI CONNECTIONS
// ClawAgent.uses({ ai_languageModel: GeminiFlash, ai_memory: ChatMemory, ai_tool: [DenkTool, Datumzeit, GetTasks, UpsertTask, GetSubtasks, UpsertSubtask, UpdateUserInfo] })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'aRKiZkBhBDytjO1m',
    name: 'WF6 - AI Personal Assistant',
    active: false,
    settings: { executionOrder: 'v1', callerPolicy: 'workflowsFromSameOwner', availableInMCP: false },
})
export class Wf6AiPersonalAssistantWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: 'c6a10001-1111-4000-a000-000000000001',
        name: 'Chat Trigger',
        type: '@n8n/n8n-nodes-langchain.chatTrigger',
        version: 1.4,
        position: [0, 200],
    })
    ChatTrigger = {
        public: false,
        initialMessages: 'Hallo! Ich bin n8nClaw. Wie kann ich dir helfen?',
    };

    @node({
        id: 'c6a10002-1111-4000-a000-000000000001',
        webhookId: 'c6a10002-2222-4000-a000-000000000001',
        name: 'Telegram Trigger',
        type: 'n8n-nodes-base.telegramTrigger',
        version: 1.2,
        position: [0, 600],
        credentials: { telegramApi: { id: 'nzmbw9ZNGZdA9sZp', name: 'Telegram Bot' } },
    })
    TelegramTrigger = {
        updates: ['message'],
        additionalFields: {},
    };

    @node({
        id: 'c6a10002-1111-4000-a000-000000000002',
        name: 'Filter',
        type: 'n8n-nodes-base.filter',
        version: 2.3,
        position: [200, 600],
    })
    Filter = {
        conditions: {
            options: {
                version: 3,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'loose',
            },
            combinator: 'and',
            conditions: [
                {
                    operator: {
                        type: 'number',
                        operation: 'equals',
                    },
                    leftValue: '={{ $json.message.chat.id }}',
                    rightValue: 443039215,
                },
            ],
        },
        looseTypeValidation: true,
        options: {},
    };

    @node({
        id: 'c6a10002-1111-4000-a000-000000000003',
        name: 'Media Switch',
        type: 'n8n-nodes-base.switch',
        version: 3.4,
        position: [400, 600],
    })
    MediaSwitch = {
        rules: {
            values: [
                {
                    outputKey: 'Voice',
                    renameOutput: true,
                    conditions: {
                        options: {
                            version: 3,
                            leftValue: '',
                            caseSensitive: true,
                            typeValidation: 'strict',
                        },
                        combinator: 'and',
                        conditions: [
                            {
                                operator: {
                                    type: 'object',
                                    operation: 'exists',
                                    singleValue: true,
                                },
                                leftValue: '={{ $json.message.voice }}',
                                rightValue: '',
                            },
                        ],
                    },
                },
                {
                    outputKey: 'Image',
                    renameOutput: true,
                    conditions: {
                        options: {
                            version: 3,
                            leftValue: '',
                            caseSensitive: true,
                            typeValidation: 'strict',
                        },
                        combinator: 'and',
                        conditions: [
                            {
                                operator: {
                                    type: 'array',
                                    operation: 'exists',
                                    singleValue: true,
                                },
                                leftValue: '={{ $json.message.photo }}',
                                rightValue: '',
                            },
                        ],
                    },
                },
                {
                    outputKey: 'Document',
                    renameOutput: true,
                    conditions: {
                        options: {
                            version: 3,
                            leftValue: '',
                            caseSensitive: true,
                            typeValidation: 'strict',
                        },
                        combinator: 'and',
                        conditions: [
                            {
                                operator: {
                                    type: 'object',
                                    operation: 'exists',
                                    singleValue: true,
                                },
                                leftValue: '={{ $json.message.document }}',
                                rightValue: '',
                            },
                        ],
                    },
                },
            ],
        },
        options: {
            fallbackOutput: 'extra',
        },
    };

    @node({
        id: 'c6a10002-1111-4000-a000-000000000004',
        webhookId: 'c6a10002-3333-4000-a000-000000000001',
        name: 'Get Voice File',
        type: 'n8n-nodes-base.telegram',
        version: 1.2,
        position: [600, 400],
        credentials: { telegramApi: { id: 'nzmbw9ZNGZdA9sZp', name: 'Telegram Bot' } },
    })
    GetVoiceFile = {
        resource: 'file',
        fileId: '={{ $json.message.voice.file_id }}',
        additionalFields: {},
    };

    @node({
        id: 'c6a10002-1111-4000-a000-000000000005',
        webhookId: 'c6a10002-3333-4000-a000-000000000002',
        name: 'Get Image File',
        type: 'n8n-nodes-base.telegram',
        version: 1.2,
        position: [600, 600],
        credentials: { telegramApi: { id: 'nzmbw9ZNGZdA9sZp', name: 'Telegram Bot' } },
    })
    GetImageFile = {
        resource: 'file',
        fileId: '={{ $json.message.photo[3].file_id }}',
        additionalFields: {},
    };

    @node({
        id: 'c6a10002-1111-4000-a000-000000000006',
        webhookId: 'c6a10002-3333-4000-a000-000000000003',
        name: 'Get Document File',
        type: 'n8n-nodes-base.telegram',
        version: 1.2,
        position: [600, 800],
        credentials: { telegramApi: { id: 'nzmbw9ZNGZdA9sZp', name: 'Telegram Bot' } },
    })
    GetDocumentFile = {
        resource: 'file',
        fileId: '={{ $json.message.document.file_id }}',
        additionalFields: {},
    };

    @node({
        id: 'c6a10002-1111-4000-a000-000000000007',
        name: 'Transcribe Voice',
        type: '@n8n/n8n-nodes-langchain.googleGemini',
        version: 1,
        position: [800, 400],
        credentials: { googlePalmApi: { id: 'FVE8T8mYCgIRpSyv', name: 'Google Gemini' } },
    })
    TranscribeVoice = {
        resource: 'audio',
        modelId: {
            __rl: true,
            mode: 'list',
            value: 'models/gemini-2.0-flash',
        },
        inputType: 'binary',
        options: {},
    };

    @node({
        id: 'c6a10002-1111-4000-a000-000000000008',
        name: 'Analyze Image',
        type: '@n8n/n8n-nodes-langchain.googleGemini',
        version: 1,
        position: [800, 600],
        credentials: { googlePalmApi: { id: 'FVE8T8mYCgIRpSyv', name: 'Google Gemini' } },
    })
    AnalyzeImage = {
        resource: 'image',
        operation: 'analyze',
        modelId: {
            __rl: true,
            mode: 'list',
            value: 'models/gemini-2.0-flash',
        },
        inputType: 'binary',
        options: {},
    };

    @node({
        id: 'c6a10002-1111-4000-a000-000000000009',
        name: 'Analyze Document',
        type: '@n8n/n8n-nodes-langchain.googleGemini',
        version: 1,
        position: [800, 800],
        credentials: { googlePalmApi: { id: 'FVE8T8mYCgIRpSyv', name: 'Google Gemini' } },
    })
    AnalyzeDocument = {
        resource: 'document',
        modelId: {
            __rl: true,
            mode: 'list',
            value: 'models/gemini-2.0-flash',
        },
        inputType: 'binary',
        options: {},
    };

    @node({
        id: 'c6a10001-1111-4000-a000-000000000003',
        name: 'Get Init Profile',
        type: 'n8n-nodes-base.dataTable',
        version: 1,
        position: [1050, 600],
    })
    GetInitProfile = {
        operation: 'get',
        returnAll: true,
        dataTableId: {
            __rl: true,
            mode: 'list',
            value: 'MVbflMz24gxysx6W',
        },
    };

    @node({
        id: 'c6a10001-1111-4000-a000-000000000004',
        name: 'Edit Fields TG',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [1250, 600],
    })
    EditFieldsTg = {
        options: {},
        assignments: {
            assignments: [
                {
                    id: 'wf6-tg-user-message',
                    name: 'user_message',
                    type: 'string',
                    value: "={{ $if($('Transcribe Voice').isExecuted, $('Transcribe Voice').item.json.content.parts[0].text, $if($('Analyze Document').isExecuted, $('Analyze Document').item.json.content.parts[0].text, $if($('Analyze Image').isExecuted, $('Analyze Image').item.json.content.parts[0].text, $('Filter').item.json.message.text))) }}",
                },
                {
                    id: 'wf6-tg-system-prompt',
                    name: 'system_prompt_details',
                    type: 'string',
                    value: `=username: {{ $json.username || "[COLLECT and use database tool to upsert] Field: username | Prompt: Ask the user to choose a username. This will be their unique identifier. | Rules: Save exactly as provided, no modifications. | Example: 'shabbir', 'nova_builder'" }}
soul: {{ $json.soul || "[COLLECT and use database tool to upsert] Field: soul | Prompt: Ask the user to define your soul - give you a name, a vibe, and a general purpose. | Rules: Combine all three elements (name, vibe, purpose) into a single concise description. | Example: 'Nova - warm and curious - helps brainstorm creative projects'" }}
user: {{ $json.user || "[COLLECT and use database tool to upsert] Field: user | Prompt: Ask the user to tell you about themselves - anything they want you to remember. | Rules: Consolidate their response into a structured profile. Include interests, goals, preferences, and any relevant context. | Example: 'AI automation consultant, prefers direct communication, focused on scaling content workflows'" }}`,
                },
                {
                    id: 'wf6-tg-last-channel',
                    name: 'last_channel',
                    type: 'string',
                    value: '=telegram',
                },
            ],
        },
    };

    @node({
        id: 'c6a10002-1111-4000-a000-000000000010',
        name: 'Get Init Profile Chat',
        type: 'n8n-nodes-base.dataTable',
        version: 1,
        position: [250, 200],
    })
    GetInitProfileChat = {
        operation: 'get',
        returnAll: true,
        dataTableId: {
            __rl: true,
            mode: 'list',
            value: 'MVbflMz24gxysx6W',
        },
    };

    @node({
        id: 'c6a10002-1111-4000-a000-000000000011',
        name: 'Edit Fields Chat',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [500, 200],
    })
    EditFieldsChat = {
        options: {},
        assignments: {
            assignments: [
                {
                    id: 'wf6-chat-user-message',
                    name: 'user_message',
                    type: 'string',
                    value: "={{ $('Chat Trigger').item.json.chatInput || '' }}",
                },
                {
                    id: 'wf6-chat-system-prompt',
                    name: 'system_prompt_details',
                    type: 'string',
                    value: `=username: {{ $json.username || "[COLLECT and use database tool to upsert] Field: username | Prompt: Ask the user to choose a username. This will be their unique identifier. | Rules: Save exactly as provided, no modifications. | Example: 'shabbir', 'nova_builder'" }}
soul: {{ $json.soul || "[COLLECT and use database tool to upsert] Field: soul | Prompt: Ask the user to define your soul - give you a name, a vibe, and a general purpose. | Rules: Combine all three elements (name, vibe, purpose) into a single concise description. | Example: 'Nova - warm and curious - helps brainstorm creative projects'" }}
user: {{ $json.user || "[COLLECT and use database tool to upsert] Field: user | Prompt: Ask the user to tell you about themselves - anything they want you to remember. | Rules: Consolidate their response into a structured profile. Include interests, goals, preferences, and any relevant context. | Example: 'AI automation consultant, prefers direct communication, focused on scaling content workflows'" }}`,
                },
                {
                    id: 'wf6-chat-last-channel',
                    name: 'last_channel',
                    type: 'string',
                    value: '=chat',
                },
            ],
        },
    };

    @node({
        id: 'c6a10002-1111-4000-a000-000000000012',
        webhookId: 'c6a10002-4444-4000-a000-000000000001',
        name: 'Send Telegram',
        type: 'n8n-nodes-base.telegram',
        version: 1.2,
        position: [1800, 600],
        credentials: { telegramApi: { id: 'nzmbw9ZNGZdA9sZp', name: 'Telegram Bot' } },
    })
    SendTelegram = {
        chatId: '={{ $("Filter").item.json.message.chat.id }}',
        text: '={{ ($json.output || "").split("*").join("").split("`").join("").split("_").join("") }}',
        additionalFields: {},
    };

    @node({
        id: 'c6a10002-1111-4000-a000-000000000013',
        name: 'Output Switch',
        type: 'n8n-nodes-base.switch',
        version: 3.4,
        position: [1600, 400],
    })
    OutputSwitch = {
        rules: {
            values: [
                {
                    outputKey: 'Telegram',
                    renameOutput: true,
                    conditions: {
                        options: {
                            version: 3,
                            leftValue: '',
                            caseSensitive: true,
                            typeValidation: 'strict',
                        },
                        combinator: 'and',
                        conditions: [
                            {
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                                leftValue:
                                    "={{ $if($('Edit Fields TG').isExecuted, $('Edit Fields TG').item.json.last_channel, $('Edit Fields Chat').item.json.last_channel) }}",
                                rightValue: 'telegram',
                            },
                        ],
                    },
                },
            ],
        },
        options: {
            fallbackOutput: 'extra',
        },
    };

    @node({
        id: 'c6a10001-1111-4000-a000-000000000005',
        name: 'Claw Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3,
        position: [950, 400],
    })
    ClawAgent = {
        promptType: 'define',
        text: '={{ $json.user_message }}',
        options: {
            systemMessage: `=You are n8nClaw, an advanced, proactive AI assistant with access to advanced tools. Your functionality is according to the below details.

{{ $json.system_prompt_details }}

The User field is a living document. Any new and important information that you receive related to the user - that is worth remembering to be useful in future conversations - is to be added there using the update info tool. Any recurring tasks the user expects you to do (manage calendar, etc - should also go into the user field)

You also have access to read, create, and update tasks and subtasks through two data tables - one for tasks and one for subtasks.

Anything the user asks you to do must be logged to the tasks and subtasks tables. You can then work on those tasks and subtasks, and update them with lots of detail - as necessary.

Task and subtask details should be upserted with any info required. For example, if you completed a task/subtask partially, update the details with whatever you've already done so you can pick up from there in the next iteration.

Additionally, As you work on a task/subtask, it may require additional tasks/subtasks to be created - do so if needed, adding all relevant details.

Once a task or subtask is done, mark task_completed or subtask_completed as true. An entire task can only be completed once ALL subtasks are complete.

You should always search for tasks first, and then search for the subtasks by the task ID, and plan your work accordingly.

Use the think tool to reason through complex questions before answering.

CRITICAL TOOL USAGE RULES:
- When the system_prompt_details above contains "[COLLECT and use database tool to upsert]", you MUST use the "Update User Info" tool to save the user's answer IMMEDIATELY after they respond. Do NOT just ask the next question without saving first.
- When collecting username: save it via Update User Info tool with the username field, then ask for soul.
- When collecting soul: save it via Update User Info tool with the soul field, then ask for user.
- When collecting user info: save it via Update User Info tool with the user field.
- For every tool call, you must provide the conditions0_Value parameter (the username to match on).
- You MUST call tools proactively. Never just respond with text when a tool call is needed.

IMPORTANT: The user prefers German responses. Antworte auf Deutsch, kurz und praegnant.`,
        },
    };

    @node({
        id: 'c6a10001-1111-4000-a000-000000000006',
        name: 'Gemini Flash',
        type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
        version: 1,
        position: [750, 700],
        credentials: { googlePalmApi: { id: 'FVE8T8mYCgIRpSyv', name: 'Google Gemini' } },
    })
    GeminiFlash = {
        modelName: 'models/gemini-2.0-flash',
        options: {
            temperature: 0.4,
        },
    };

    @node({
        id: 'c6a10001-1111-4000-a000-000000000007',
        name: 'Chat Memory',
        type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
        version: 1.3,
        position: [900, 700],
    })
    ChatMemory = {
        sessionKey: 'marius-claw',
        sessionIdType: 'customKey',
        contextWindowLength: 15,
    };

    @node({
        id: 'c6a10001-1111-4000-a000-000000000008',
        name: 'Denk-Tool',
        type: '@n8n/n8n-nodes-langchain.toolCode',
        version: 1.3,
        position: [1050, 700],
    })
    DenkTool = {
        name: 'think',
        description: 'Nutze dieses Tool um ueber komplexe Fragen nachzudenken. Gib deine Gedanken als Text ein.',
        language: 'javaScript',
        jsCode: 'return query;',
        specifyInputSchema: true,
        schemaType: 'manual',
        inputSchema:
            '{ "type": "object", "properties": { "query": { "type": "string", "description": "The thought or reasoning to process" } }, "required": ["query"] }',
    };

    @node({
        id: 'c6a10001-1111-4000-a000-000000000009',
        name: 'DatumZeit',
        type: '@n8n/n8n-nodes-langchain.toolCode',
        version: 1.3,
        position: [1200, 700],
    })
    Datumzeit = {
        name: 'get_current_datetime',
        description: 'Gibt das aktuelle Datum und die Uhrzeit zurueck. Uebergib einen beliebigen Text als Eingabe.',
        language: 'javaScript',
        jsCode: 'const now = new Date(); const optD = { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Europe/Berlin" }; const optT = { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Berlin" }; return "Datum: " + now.toLocaleDateString("de-DE", optD) + ", Uhrzeit: " + now.toLocaleTimeString("de-DE", optT) + " (Europe/Berlin)";',
        specifyInputSchema: true,
        schemaType: 'manual',
        inputSchema:
            '{ "type": "object", "properties": { "query": { "type": "string", "description": "Any text" } }, "required": ["query"] }',
    };

    @node({
        id: 'c6a10001-1111-4000-a000-000000000010',
        name: 'Get Tasks',
        type: 'n8n-nodes-base.dataTableTool',
        version: 1,
        position: [1350, 700],
    })
    GetTasks = {
        operation: 'get',
        returnAll: "={{ $fromAI('Return_All', '', 'boolean') }}",
        dataTableId: {
            __rl: true,
            mode: 'list',
            value: 'CIlvsSZ71ndYUtz4',
        },
        descriptionType: 'manual',
        toolDescription: 'Get pending or completed tasks',
    };

    @node({
        id: 'c6a10001-1111-4000-a000-000000000011',
        name: 'Upsert Task',
        type: 'n8n-nodes-base.dataTableTool',
        version: 1,
        position: [1500, 700],
    })
    UpsertTask = {
        operation: 'upsert',
        dataTableId: {
            __rl: true,
            mode: 'list',
            value: 'CIlvsSZ71ndYUtz4',
        },
        columns: {
            value: {
                task_name: "={{ $fromAI('task_name', '', 'string') }}",
                task_details: "={{ $fromAI('task_details', '', 'string') }}",
                task_complete: "={{ $fromAI('task_complete', '', 'boolean') }}",
                is_recurring: "={{ $fromAI('is_recurring', '', 'boolean') }}",
            },
            schema: [
                {
                    id: 'task_name',
                    type: 'string',
                    display: true,
                    removed: false,
                    readOnly: false,
                    required: false,
                    displayName: 'task_name',
                    defaultMatch: false,
                },
                {
                    id: 'task_details',
                    type: 'string',
                    display: true,
                    removed: false,
                    readOnly: false,
                    required: false,
                    displayName: 'task_details',
                    defaultMatch: false,
                },
                {
                    id: 'task_complete',
                    type: 'boolean',
                    display: true,
                    removed: false,
                    readOnly: false,
                    required: false,
                    displayName: 'task_complete',
                    defaultMatch: false,
                },
                {
                    id: 'is_recurring',
                    type: 'boolean',
                    display: true,
                    removed: false,
                    readOnly: false,
                    required: false,
                    displayName: 'is_recurring',
                    defaultMatch: false,
                },
            ],
            mappingMode: 'defineBelow',
            matchingColumns: [],
            attemptToConvertTypes: false,
            convertFieldsToString: false,
        },
        filters: {
            conditions: [
                {
                    keyName: 'task_name',
                    keyValue: "={{ $fromAI('conditions0_Value', '', 'string') }}",
                },
            ],
        },
        options: {},
        descriptionType: 'manual',
        toolDescription: 'Upsert task',
    };

    @node({
        id: 'c6a10001-1111-4000-a000-000000000012',
        name: 'Get Subtasks',
        type: 'n8n-nodes-base.dataTableTool',
        version: 1,
        position: [1650, 700],
    })
    GetSubtasks = {
        operation: 'get',
        returnAll: "={{ $fromAI('Return_All', '', 'boolean') }}",
        dataTableId: {
            __rl: true,
            mode: 'list',
            value: 'L5sKqj62NFXMjyDY',
        },
        filters: {
            conditions: [
                {
                    keyName: 'parent_task_id',
                    keyValue: "={{ $fromAI('conditions0_Value', '', 'string') }}",
                },
            ],
        },
        descriptionType: 'manual',
        toolDescription: 'Get pending or completed subtasks',
    };

    @node({
        id: 'c6a10001-1111-4000-a000-000000000013',
        name: 'Upsert Subtask',
        type: 'n8n-nodes-base.dataTableTool',
        version: 1,
        position: [1800, 700],
    })
    UpsertSubtask = {
        operation: 'upsert',
        dataTableId: {
            __rl: true,
            mode: 'list',
            value: 'L5sKqj62NFXMjyDY',
        },
        columns: {
            value: {
                parent_task_id: "={{ $fromAI('parent_task_id', '', 'string') }}",
                subtask_name: "={{ $fromAI('subtask_name', '', 'string') }}",
                subtask_details: "={{ $fromAI('subtask_details', '', 'string') }}",
                subtask_complete: "={{ $fromAI('subtask_complete', '', 'boolean') }}",
            },
            schema: [
                {
                    id: 'parent_task_id',
                    type: 'string',
                    display: true,
                    removed: false,
                    readOnly: false,
                    required: false,
                    displayName: 'parent_task_id',
                    defaultMatch: false,
                },
                {
                    id: 'subtask_name',
                    type: 'string',
                    display: true,
                    removed: false,
                    readOnly: false,
                    required: false,
                    displayName: 'subtask_name',
                    defaultMatch: false,
                },
                {
                    id: 'subtask_details',
                    type: 'string',
                    display: true,
                    removed: false,
                    readOnly: false,
                    required: false,
                    displayName: 'subtask_details',
                    defaultMatch: false,
                },
                {
                    id: 'subtask_complete',
                    type: 'boolean',
                    display: true,
                    removed: false,
                    readOnly: false,
                    required: false,
                    displayName: 'subtask_complete',
                    defaultMatch: false,
                },
            ],
            mappingMode: 'defineBelow',
            matchingColumns: [],
            attemptToConvertTypes: false,
            convertFieldsToString: false,
        },
        filters: {
            conditions: [
                {
                    keyName: 'parent_task_id',
                    keyValue: "={{ $fromAI('conditions0_Value', '', 'string') }}",
                },
            ],
        },
        options: {},
        descriptionType: 'manual',
        toolDescription: 'Upsert Subtask',
    };

    @node({
        id: 'c6a10001-1111-4000-a000-000000000014',
        name: 'Update User Info',
        type: 'n8n-nodes-base.dataTableTool',
        version: 1,
        position: [1950, 700],
    })
    UpdateUserInfo = {
        operation: 'upsert',
        dataTableId: {
            __rl: true,
            mode: 'list',
            value: 'MVbflMz24gxysx6W',
        },
        columns: {
            value: {
                username: "={{ $fromAI('username', 'the username provided by the user', 'string') }}",
                soul: "={{ $fromAI('soul', '', 'string') }}",
                user: "={{ $fromAI('user', '', 'string') }}",
                heartbeat: "={{ $fromAI('heartbeat', '', 'string') }}",
                last_channel: '={{ $json.last_channel }}',
            },
            schema: [
                {
                    id: 'username',
                    type: 'string',
                    display: true,
                    removed: false,
                    readOnly: false,
                    required: false,
                    displayName: 'username',
                    defaultMatch: false,
                },
                {
                    id: 'soul',
                    type: 'string',
                    display: true,
                    removed: false,
                    readOnly: false,
                    required: false,
                    displayName: 'soul',
                    defaultMatch: false,
                },
                {
                    id: 'user',
                    type: 'string',
                    display: true,
                    removed: false,
                    readOnly: false,
                    required: false,
                    displayName: 'user',
                    defaultMatch: false,
                },
                {
                    id: 'heartbeat',
                    type: 'string',
                    display: true,
                    removed: false,
                    readOnly: false,
                    required: false,
                    displayName: 'heartbeat',
                    defaultMatch: false,
                },
                {
                    id: 'last_channel',
                    type: 'string',
                    display: true,
                    removed: false,
                    readOnly: false,
                    required: false,
                    displayName: 'last_channel',
                    defaultMatch: false,
                },
            ],
            mappingMode: 'defineBelow',
            matchingColumns: [],
            attemptToConvertTypes: false,
            convertFieldsToString: false,
        },
        filters: {
            conditions: [
                {
                    keyName: 'username',
                    keyValue: "={{ $fromAI('conditions0_Value', '', 'string') }}",
                },
            ],
        },
        options: {},
        descriptionType: 'manual',
        toolDescription: 'Initialize first usage',
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.ChatTrigger.out(0).to(this.GetInitProfileChat.in(0));
        this.GetInitProfileChat.out(0).to(this.EditFieldsChat.in(0));
        this.EditFieldsChat.out(0).to(this.ClawAgent.in(0));
        this.TelegramTrigger.out(0).to(this.Filter.in(0));
        this.Filter.out(0).to(this.MediaSwitch.in(0));
        this.MediaSwitch.out(0).to(this.GetVoiceFile.in(0));
        this.MediaSwitch.out(1).to(this.GetImageFile.in(0));
        this.MediaSwitch.out(2).to(this.GetDocumentFile.in(0));
        this.MediaSwitch.out(3).to(this.GetInitProfile.in(0));
        this.GetVoiceFile.out(0).to(this.TranscribeVoice.in(0));
        this.GetImageFile.out(0).to(this.AnalyzeImage.in(0));
        this.GetDocumentFile.out(0).to(this.AnalyzeDocument.in(0));
        this.TranscribeVoice.out(0).to(this.GetInitProfile.in(0));
        this.AnalyzeImage.out(0).to(this.GetInitProfile.in(0));
        this.AnalyzeDocument.out(0).to(this.GetInitProfile.in(0));
        this.GetInitProfile.out(0).to(this.EditFieldsTg.in(0));
        this.EditFieldsTg.out(0).to(this.ClawAgent.in(0));
        this.ClawAgent.out(0).to(this.OutputSwitch.in(0));
        this.OutputSwitch.out(0).to(this.SendTelegram.in(0));

        this.ClawAgent.uses({
            ai_languageModel: this.GeminiFlash.output,
            ai_memory: this.ChatMemory.output,
            ai_tool: [
                this.DenkTool.output,
                this.Datumzeit.output,
                this.GetTasks.output,
                this.UpsertTask.output,
                this.GetSubtasks.output,
                this.UpsertSubtask.output,
                this.UpdateUserInfo.output,
            ],
        });
    }
}
