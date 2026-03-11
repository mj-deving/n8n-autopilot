import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : WF2 - AI Text-Assistent
// Nodes   : 8  |  Connections: 8
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// WebhookEingang                     webhook
// GeminiFlash                        lmChatGoogleGemini         [creds] [ai_languageModel]
// AiAnalyse                          chainLlm                   [AI]
// ErgebnisParsen                     code
// Dringlichkeit                      switch
// TelegramDringend                   telegram                   [creds]
// TelegramNormal                     telegram                   [creds]
// AntwortSenden                      respondToWebhook
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// WebhookEingang
//    → AiAnalyse
//      → ErgebnisParsen
//        → Dringlichkeit
//          → TelegramDringend
//            → AntwortSenden
//         .out(1) → TelegramNormal
//            → AntwortSenden (↩ loop)
//         .out(2) → AntwortSenden (↩ loop)
//
// AI CONNECTIONS
// AiAnalyse.uses({ ai_languageModel: GeminiFlash })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: '4d077yRyHsV0v1Va',
    name: 'WF2 - AI Text-Assistent',
    active: true,
    settings: { executionOrder: 'v1', callerPolicy: 'workflowsFromSameOwner', availableInMCP: false },
})
export class Wf2AiTextAssistentWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '1d3c4e19-9ff5-47c3-aae7-cafa03329248',
        webhookId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Webhook Eingang',
        type: 'n8n-nodes-base.webhook',
        version: 2.1,
        position: [0, 300],
    })
    WebhookEingang = {
        httpMethod: 'POST',
        path: 'classify',
        responseMode: 'responseNode',
        options: {},
    };

    @node({
        id: 'd1eb7666-6439-40fe-984f-52b2c772c94f',
        name: 'Gemini Flash',
        type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
        version: 1,
        position: [300, 500],
        credentials: { googlePalmApi: { id: 'FVE8T8mYCgIRpSyv', name: 'Google Gemini' } },
    })
    GeminiFlash = {
        modelName: 'models/gemini-2.0-flash',
        options: {
            temperature: 0.2,
        },
    };

    @node({
        id: 'cb813ba1-8284-4532-a265-04f99781b8aa',
        name: 'AI Analyse',
        type: '@n8n/n8n-nodes-langchain.chainLlm',
        version: 1.9,
        position: [300, 300],
    })
    AiAnalyse = {
        promptType: 'define',
        text: `={{ \`Analysiere diesen Text und antworte als reines JSON.

Quelle: \${$json.body.source || "unbekannt"}
Text: \${$json.body.text}

JSON Format: {"kategorie": "Support|Sales|Info|Spam|Persoenlich", "dringlichkeit": "hoch|mittel|niedrig", "zusammenfassung": "2 Saetze", "vorgeschlagene_antwort": "kurzer Antwortvorschlag", "stichworte": ["max", "3", "tags"]}\` }}`,
        messages: {
            messageValues: [
                {
                    type: 'SystemMessagePromptTemplate',
                    message:
                        'Du bist ein intelligenter Text-Assistent fuer ein Unternehmen. Klassifiziere eingehende Texte (Emails, Tickets, Anfragen) nach Kategorie und Dringlichkeit. Antworte immer als reines JSON ohne Markdown.',
                },
            ],
        },
    };

    @node({
        id: '989c3904-a772-4fc9-aec0-84501db86c64',
        name: 'Ergebnis parsen',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [550, 300],
    })
    ErgebnisParsen = {
        mode: 'runOnceForEachItem',
        language: 'javaScript',
        jsCode: `const raw = $json.text || $json.response || "";
try {
  const match = raw.match(/\\{[\\s\\S]*\\}/);
  if (match) {
    const parsed = JSON.parse(match[0]);
    return { json: { ...parsed, originalText: $json.body?.text || "", source: $json.body?.source || "unbekannt" } };
  }
} catch (e) {}
return { json: { kategorie: "Sonstiges", dringlichkeit: "niedrig", zusammenfassung: "Analyse fehlgeschlagen", vorgeschlagene_antwort: "", stichworte: [], originalText: $json.body?.text || "", source: $json.body?.source || "" } };`,
    };

    @node({
        id: '28150379-77be-4ce9-8965-4f70ea169996',
        name: 'Dringlichkeit',
        type: 'n8n-nodes-base.switch',
        version: 3.4,
        position: [800, 300],
    })
    Dringlichkeit = {
        mode: 'rules',
        rules: {
            values: [
                {
                    conditions: {
                        options: {
                            caseSensitive: false,
                            leftValue: '',
                            typeValidation: 'loose',
                        },
                        conditions: [
                            {
                                leftValue: '={{ $json.dringlichkeit }}',
                                rightValue: 'hoch',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'hoch',
                },
                {
                    conditions: {
                        options: {
                            caseSensitive: false,
                            leftValue: '',
                            typeValidation: 'loose',
                        },
                        conditions: [
                            {
                                leftValue: '={{ $json.dringlichkeit }}',
                                rightValue: 'mittel',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'mittel',
                },
                {
                    conditions: {
                        options: {
                            caseSensitive: false,
                            leftValue: '',
                            typeValidation: 'loose',
                        },
                        conditions: [
                            {
                                leftValue: '={{ $json.dringlichkeit }}',
                                rightValue: 'niedrig',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'niedrig',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '25d2b018-c608-49aa-ac5f-8ca30c4633fd',
        name: 'Telegram Dringend',
        type: 'n8n-nodes-base.telegram',
        version: 1.2,
        position: [1100, 150],
        credentials: { telegramApi: { id: 'nzmbw9ZNGZdA9sZp', name: 'Telegram Bot' } },
    })
    TelegramDringend = {
        resource: 'message',
        operation: 'sendMessage',
        chatId: '443039215',
        text: '={{ "DRINGEND [" + $json.kategorie + "]\\n\\n" + $json.zusammenfassung + "\\n\\nAntwortvorschlag:\\n" + $json.vorgeschlagene_antwort }}',
        additionalFields: {},
    };

    @node({
        id: '78b57cad-e988-49b7-bc7a-57cca72bb1ca',
        name: 'Telegram Normal',
        type: 'n8n-nodes-base.telegram',
        version: 1.2,
        position: [1100, 350],
        credentials: { telegramApi: { id: 'nzmbw9ZNGZdA9sZp', name: 'Telegram Bot' } },
    })
    TelegramNormal = {
        resource: 'message',
        operation: 'sendMessage',
        chatId: '443039215',
        text: '={{ "[" + $json.kategorie + "] " + $json.zusammenfassung }}',
        additionalFields: {},
    };

    @node({
        id: '62fee83b-e5ca-4b21-80fd-31d48c3958fc',
        name: 'Antwort senden',
        type: 'n8n-nodes-base.respondToWebhook',
        version: 1.1,
        position: [1100, 550],
    })
    AntwortSenden = {
        respondWith: 'json',
        responseBody: '={{ $json }}',
        options: {},
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.WebhookEingang.out(0).to(this.AiAnalyse.in(0));
        this.AiAnalyse.out(0).to(this.ErgebnisParsen.in(0));
        this.ErgebnisParsen.out(0).to(this.Dringlichkeit.in(0));
        this.Dringlichkeit.out(0).to(this.TelegramDringend.in(0));
        this.Dringlichkeit.out(1).to(this.TelegramNormal.in(0));
        this.Dringlichkeit.out(2).to(this.AntwortSenden.in(0));
        this.TelegramDringend.out(0).to(this.AntwortSenden.in(0));
        this.TelegramNormal.out(0).to(this.AntwortSenden.in(0));

        this.AiAnalyse.uses({
            ai_languageModel: this.GeminiFlash.output,
        });
    }
}
