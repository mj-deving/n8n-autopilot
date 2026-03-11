import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : WF4 - AI Dokument-Pipeline
// Nodes   : 8  |  Connections: 8
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// WebhookEingang                     webhook
// GeminiFlash                        lmChatGoogleGemini         [creds] [ai_languageModel]
// DokumentAnalyse                    chainLlm                   [AI]
// ErgebnisParsen                     code
// DokumentTyp                        switch
// TelegramWichtig                    telegram                   [creds]
// TelegramInfo                       telegram                   [creds]
// AntwortSenden                      respondToWebhook
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// WebhookEingang
//    → DokumentAnalyse
//      → ErgebnisParsen
//        → DokumentTyp
//          → TelegramWichtig
//            → AntwortSenden
//         .out(1) → TelegramWichtig (↩ loop)
//         .out(2) → TelegramInfo
//            → AntwortSenden (↩ loop)
//
// AI CONNECTIONS
// DokumentAnalyse.uses({ ai_languageModel: GeminiFlash })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'yCDukWYNtDQ8O4de',
    name: 'WF4 - AI Dokument-Pipeline',
    active: false,
    settings: { executionOrder: 'v1', callerPolicy: 'workflowsFromSameOwner', availableInMCP: false },
})
export class Wf4AiDokumentPipelineWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: 'aa11bb22-cc33-4dd4-ee55-ff6677889900',
        webhookId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        name: 'Webhook Eingang',
        type: 'n8n-nodes-base.webhook',
        version: 2.1,
        position: [0, 300],
    })
    WebhookEingang = {
        httpMethod: 'POST',
        path: 'dokument',
        responseMode: 'responseNode',
        options: {},
    };

    @node({
        id: 'bb22cc33-dd44-4ee5-ff66-001122334455',
        name: 'Gemini Flash',
        type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
        version: 1,
        position: [300, 500],
        credentials: { googlePalmApi: { id: 'FVE8T8mYCgIRpSyv', name: 'Google Gemini' } },
    })
    GeminiFlash = {
        modelName: 'models/gemini-2.0-flash',
        options: {
            temperature: 0.1,
        },
    };

    @node({
        id: 'cc33dd44-ee55-4ff6-0011-223344556677',
        name: 'Dokument-Analyse',
        type: '@n8n/n8n-nodes-langchain.chainLlm',
        version: 1.9,
        position: [300, 300],
    })
    DokumentAnalyse = {
        promptType: 'define',
        text: `={{ \`Analysiere dieses Dokument und extrahiere strukturierte Daten. Antworte als reines JSON.

Quelle: \${$json.body.source || "unbekannt"}
Dateiname: \${$json.body.filename || "unbekannt"}
Text: \${$json.body.text}

JSON Format:
{
  "dokumenttyp": "Rechnung|Vertrag|Beleg|Sonstiges",
  "zusammenfassung": "1-2 Saetze",
  "absender": "Name oder Firma",
  "datum": "TT.MM.JJJJ oder unbekannt",
  "betrag": "Gesamtbetrag oder null",
  "waehrung": "EUR|USD|CHF oder null",
  "wichtigkeit": "hoch|mittel|niedrig",
  "extrahierte_daten": {}
}\` }}`,
        messages: {
            messageValues: [
                {
                    type: 'SystemMessagePromptTemplate',
                    message:
                        'Du bist ein intelligenter Dokumenten-Assistent. Klassifiziere und extrahiere strukturierte Daten aus Dokumenten. Antworte immer als reines JSON ohne Markdown.',
                },
            ],
        },
    };

    @node({
        id: 'dd44ee55-ff66-4007-1122-334455667788',
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
    return { json: { ...parsed, originalText: $json.body?.text || "", source: $json.body?.source || "unbekannt", filename: $json.body?.filename || "unbekannt" } };
  }
} catch (e) {}
return { json: { dokumenttyp: "Sonstiges", zusammenfassung: "Analyse fehlgeschlagen", absender: "", datum: "", betrag: null, waehrung: null, wichtigkeit: "niedrig", extrahierte_daten: {}, originalText: $json.body?.text || "", source: $json.body?.source || "", filename: $json.body?.filename || "" } };`,
    };

    @node({
        id: 'ee55ff66-0077-4188-2233-445566778899',
        name: 'Dokument-Typ',
        type: 'n8n-nodes-base.switch',
        version: 3.4,
        position: [800, 300],
    })
    DokumentTyp = {
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
                                leftValue: '={{ $json.dokumenttyp }}',
                                rightValue: 'Rechnung',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'Rechnung',
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
                                leftValue: '={{ $json.dokumenttyp }}',
                                rightValue: 'Vertrag',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'Vertrag',
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
                                leftValue: '={{ $json.dokumenttyp }}',
                                rightValue: '',
                                operator: {
                                    type: 'string',
                                    operation: 'exists',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'Sonstiges',
                },
            ],
        },
        options: {},
    };

    @node({
        id: 'ff660077-1188-4299-3344-556677889900',
        name: 'Telegram Wichtig',
        type: 'n8n-nodes-base.telegram',
        version: 1.2,
        position: [1100, 150],
        credentials: { telegramApi: { id: 'nzmbw9ZNGZdA9sZp', name: 'Telegram Bot' } },
    })
    TelegramWichtig = {
        resource: 'message',
        operation: 'sendMessage',
        chatId: '443039215',
        text: '={{ "DOKUMENT [" + $json.dokumenttyp + "]\\n" + $json.absender + " | " + $json.datum + "\\n" + ($json.betrag ? $json.betrag + " " + $json.waehrung : "") + "\\n\\n" + $json.zusammenfassung }}',
        additionalFields: {},
    };

    @node({
        id: '00112233-4455-4667-8899-aabbccddeeff',
        name: 'Telegram Info',
        type: 'n8n-nodes-base.telegram',
        version: 1.2,
        position: [1100, 350],
        credentials: { telegramApi: { id: 'nzmbw9ZNGZdA9sZp', name: 'Telegram Bot' } },
    })
    TelegramInfo = {
        resource: 'message',
        operation: 'sendMessage',
        chatId: '443039215',
        text: '={{ "[" + $json.dokumenttyp + "] " + $json.zusammenfassung }}',
        additionalFields: {},
    };

    @node({
        id: '11223344-5566-4778-99aa-bbccddeeff00',
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
        this.WebhookEingang.out(0).to(this.DokumentAnalyse.in(0));
        this.DokumentAnalyse.out(0).to(this.ErgebnisParsen.in(0));
        this.ErgebnisParsen.out(0).to(this.DokumentTyp.in(0));
        this.DokumentTyp.out(0).to(this.TelegramWichtig.in(0));
        this.DokumentTyp.out(1).to(this.TelegramWichtig.in(0));
        this.DokumentTyp.out(2).to(this.TelegramInfo.in(0));
        this.TelegramWichtig.out(0).to(this.AntwortSenden.in(0));
        this.TelegramInfo.out(0).to(this.AntwortSenden.in(0));

        this.DokumentAnalyse.uses({
            ai_languageModel: this.GeminiFlash.output,
        });
    }
}
