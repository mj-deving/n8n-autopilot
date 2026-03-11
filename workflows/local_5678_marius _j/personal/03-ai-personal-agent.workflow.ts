import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : WF3 - AI Personal Agent
// Nodes   : 7  |  Connections: 1
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ChatTrigger                        chatTrigger
// PersonalAgent                      agent                      [AI]
// GeminiFlash                        lmChatGoogleGemini         [creds] [ai_languageModel]
// ChatMemory                         memoryBufferWindow         [ai_memory]
// DenkTool                           toolCode                   [ai_tool]
// Rechner                            toolCalculator             [ai_tool]
// Datumzeit                          toolCode                   [ai_tool]
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ChatTrigger
//    → PersonalAgent
//
// AI CONNECTIONS
// PersonalAgent.uses({ ai_languageModel: GeminiFlash, ai_memory: ChatMemory, ai_tool: [DenkTool, Rechner, Datumzeit] })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: '7Q5gA7icrwirEip4',
    name: 'WF3 - AI Personal Agent',
    active: false,
    settings: { executionOrder: 'v1', callerPolicy: 'workflowsFromSameOwner', availableInMCP: false },
})
export class Wf3AiPersonalAgentWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: 'f3a71e2c-5b04-4d8e-9c16-a82f91d0e3b5',
        name: 'Chat Trigger',
        type: '@n8n/n8n-nodes-langchain.chatTrigger',
        version: 1.4,
        position: [0, 300],
    })
    ChatTrigger = {
        public: false,
        initialMessages: `Hallo! Ich bin dein persoenlicher AI-Assistent.
Ich kann rechnen, die Uhrzeit sagen und bei komplexen Fragen nachdenken.
Wie kann ich dir helfen?`,
    };

    @node({
        id: 'b8e42a17-3f59-4c6d-a091-7d2e5f8c4b6a',
        name: 'Personal Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [300, 300],
    })
    PersonalAgent = {
        promptType: 'define',
        text: '={{ $json.chatInput }}',
        options: {
            systemMessage:
                'Du bist ein hilfreicher persoenlicher AI-Assistent. Antworte auf Deutsch. Sei praezise und freundlich.',
        },
    };

    @node({
        id: '5c9d8e7f-6a3b-4219-8e5c-1d0f2a3b4c5d',
        name: 'Gemini Flash',
        type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
        version: 1,
        position: [100, 550],
        credentials: { googlePalmApi: { id: 'FVE8T8mYCgIRpSyv', name: 'Google Gemini' } },
    })
    GeminiFlash = {
        modelName: 'models/gemini-2.0-flash',
        options: {
            temperature: 0.4,
        },
    };

    @node({
        id: 'e7f6a5b4-c3d2-4e10-9f8a-7b6c5d4e3f21',
        name: 'Chat Memory',
        type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
        version: 1.3,
        position: [250, 550],
    })
    ChatMemory = {
        sessionIdType: 'fromInput',
        contextWindowLength: 10,
    };

    @node({
        id: '2a3b4c5d-6e7f-4890-ab12-cd34ef567890',
        name: 'Denk-Tool',
        type: '@n8n/n8n-nodes-langchain.toolCode',
        version: 1.3,
        position: [400, 550],
    })
    DenkTool = {
        name: 'think',
        description:
            'Nutze dieses Tool um ueber komplexe Fragen nachzudenken. Gib deine Gedanken als Text ein. Das Tool gibt sie zurueck, damit du deine Ueberlegungen ordnen kannst.',
        language: 'javaScript',
        jsCode: 'return query;',
        specifyInputSchema: true,
        schemaType: 'manual',
        inputSchema:
            '{ "type": "object", "properties": { "query": { "type": "string", "description": "The thought or reasoning to process" } }, "required": ["query"] }',
    };

    @node({
        id: '91a82b73-c4d5-4e6f-a7b8-c9d0e1f23456',
        name: 'Rechner',
        type: '@n8n/n8n-nodes-langchain.toolCalculator',
        version: 1,
        position: [550, 550],
    })
    Rechner = {};

    @node({
        id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80',
        name: 'DatumZeit',
        type: '@n8n/n8n-nodes-langchain.toolCode',
        version: 1.3,
        position: [700, 550],
    })
    Datumzeit = {
        name: 'get_current_datetime',
        description:
            'Gibt das aktuelle Datum und die Uhrzeit zurueck. Uebergib einen beliebigen Text wie "jetzt" als Eingabe.',
        language: 'javaScript',
        jsCode: 'const now = new Date(); const optD = { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Europe/Berlin" }; const optT = { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Berlin" }; return "Datum: " + now.toLocaleDateString("de-DE", optD) + ", Uhrzeit: " + now.toLocaleTimeString("de-DE", optT) + " (Europe/Berlin)";',
        specifyInputSchema: true,
        schemaType: 'manual',
        inputSchema:
            '{ "type": "object", "properties": { "query": { "type": "string", "description": "Any text, e.g. now" } }, "required": ["query"] }',
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.ChatTrigger.out(0).to(this.PersonalAgent.in(0));

        this.PersonalAgent.uses({
            ai_languageModel: this.GeminiFlash.output,
            ai_memory: this.ChatMemory.output,
            ai_tool: [this.DenkTool.output, this.Rechner.output, this.Datumzeit.output],
        });
    }
}
