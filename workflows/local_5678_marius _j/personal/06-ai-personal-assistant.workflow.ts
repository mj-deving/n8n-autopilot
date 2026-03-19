import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : WF6 - AI Personal Assistant
// Nodes   : 13  |  Connections: 3
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ChatTrigger                        chatTrigger
// GetInitProfile                     dataTable
// EditFields                         set
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
//    → GetInitProfile
//      → EditFields
//        → ClawAgent
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
    active: true,
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
        position: [0, 400],
    })
    ChatTrigger = {
        public: false,
        initialMessages: `Hallo! Ich bin dein persoenlicher KI-Assistent.
Wie kann ich dir helfen?`,
    };

    @node({
        id: 'c6a10001-1111-4000-a000-000000000003',
        name: 'Get Init Profile',
        type: 'n8n-nodes-base.dataTable',
        version: 1,
        position: [400, 400],
    })
    GetInitProfile = {
        operation: 'get',
        returnAll: true,
        dataTableId: {
            __rl: true,
            mode: 'list',
            value: 'MVbflMz24gxysx6W',
        },
        filters: {
            conditions: [
                {
                    keyName: 'username',
                    keyValue: 'marius',
                },
            ],
        },
    };

    @node({
        id: 'c6a10001-1111-4000-a000-000000000004',
        name: 'Edit Fields',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [650, 400],
    })
    EditFields = {
        options: {},
        assignments: {
            assignments: [
                {
                    id: 'wf6-assign-user-message',
                    name: 'user_message',
                    type: 'string',
                    value: "={{ $('Chat Trigger').item.json.chatInput || '' }}",
                },
                {
                    id: 'wf6-assign-system-prompt',
                    name: 'system_prompt_details',
                    type: 'string',
                    value: `=username: {{ $json.username || "[COLLECT and use database tool to upsert] Field: username | Prompt: Ask the user to choose a username. This will be their unique identifier. | Rules: Save exactly as provided, no modifications. | Example: 'shabbir', 'nova_builder'" }}
soul: {{ $json.soul || "[COLLECT and use database tool to upsert] Field: soul | Prompt: Ask the user to define your soul - give you a name, a vibe, and a general purpose. | Rules: Combine all three elements (name, vibe, purpose) into a single concise description. | Example: 'Nova - warm and curious - helps brainstorm creative projects'" }}
user: {{ $json.user || "[COLLECT and use database tool to upsert] Field: user | Prompt: Ask the user to tell you about themselves - anything they want you to remember. | Rules: Consolidate their response into a structured profile. Include interests, goals, preferences, and any relevant context. | Example: 'AI automation consultant, prefers direct communication, focused on scaling content workflows'" }}`,
                },
                {
                    id: 'wf6-assign-last-channel',
                    name: 'last_channel',
                    type: 'string',
                    value: '=chat',
                },
            ],
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
        this.ChatTrigger.out(0).to(this.GetInitProfile.in(0));
        this.GetInitProfile.out(0).to(this.EditFields.in(0));
        this.EditFields.out(0).to(this.ClawAgent.in(0));

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
