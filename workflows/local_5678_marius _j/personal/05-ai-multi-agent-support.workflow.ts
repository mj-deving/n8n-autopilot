import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : WF5 - AI Multi-Agent Support
// Nodes   : 16  |  Connections: 15
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// WebhookEingang                     webhook
// DispatcherGemini                   lmChatGoogleGemini         [creds] [ai_languageModel]
// DispatcherKlassifizierung          chainLlm                   [AI]
// KategorieParsen                    code
// RouteSwitch                        switch
// TechGemini                         lmChatGoogleGemini         [creds] [ai_languageModel]
// TechSpezialist                     chainLlm                   [AI]
// SalesGemini                        lmChatGoogleGemini         [creds] [ai_languageModel]
// SalesSpezialist                    chainLlm                   [AI]
// FaqGemini                          lmChatGoogleGemini         [creds] [ai_languageModel]
// FaqSpezialist                      chainLlm                   [AI]
// FallbackAntwort                    code
// QualitaetsCheck                    code
// DringlichkeitFilter                if
// TelegramAlert                      telegram                   [creds]
// AntwortSenden                      respondToWebhook
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// WebhookEingang
//    → DispatcherKlassifizierung
//      → KategorieParsen
//        → RouteSwitch
//          → TechSpezialist
//            → QualitaetsCheck
//              → DringlichkeitFilter
//                → TelegramAlert
//                  → AntwortSenden
//               .out(1) → AntwortSenden (↩ loop)
//         .out(1) → SalesSpezialist
//            → QualitaetsCheck (↩ loop)
//         .out(2) → FaqSpezialist
//            → QualitaetsCheck (↩ loop)
//         .out(3) → FallbackAntwort
//            → QualitaetsCheck (↩ loop)
//
// AI CONNECTIONS
// DispatcherKlassifizierung.uses({ ai_languageModel: DispatcherGemini })
// TechSpezialist.uses({ ai_languageModel: TechGemini })
// SalesSpezialist.uses({ ai_languageModel: SalesGemini })
// FaqSpezialist.uses({ ai_languageModel: FaqGemini })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'pDLr3eWlGs9ebf79',
    name: 'WF5 - AI Multi-Agent Support',
    active: true,
    settings: { executionOrder: 'v1', callerPolicy: 'workflowsFromSameOwner', availableInMCP: false },
})
export class Wf5AiMultiAgentSupportWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        webhookId: 'e7f8091a-2b3c-44d5-e6f7-a8b9c0d1e2f3',
        name: 'Webhook Eingang',
        type: 'n8n-nodes-base.webhook',
        version: 2.1,
        position: [0, 400],
    })
    WebhookEingang = {
        httpMethod: 'POST',
        path: 'support',
        responseMode: 'responseNode',
        options: {},
    };

    @node({
        id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
        name: 'Dispatcher Gemini',
        type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
        version: 1,
        position: [300, 600],
        credentials: { googlePalmApi: { id: 'FVE8T8mYCgIRpSyv', name: 'Google Gemini' } },
    })
    DispatcherGemini = {
        modelName: 'models/gemini-2.0-flash',
        options: {
            temperature: 0.1,
        },
    };

    @node({
        id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
        name: 'Dispatcher Klassifizierung',
        type: '@n8n/n8n-nodes-langchain.chainLlm',
        version: 1.9,
        position: [300, 400],
    })
    DispatcherKlassifizierung = {
        promptType: 'define',
        text: `={{ \`Klassifiziere diese Support-Anfrage und antworte als reines JSON.

Text: \${$json.body.text}
User: \${$json.body.user}
Kanal: \${$json.body.channel}

JSON Format:
{"category": "tech|sales|faq|unknown", "urgency": 1-10, "summary": "kurze Zusammenfassung"}\` }}`,
        messages: {
            messageValues: [
                {
                    type: 'SystemMessagePromptTemplate',
                    message:
                        'Du bist ein Support-Dispatcher. Klassifiziere eingehende Anfragen in: tech (technische Probleme, Server, Fehler, Code), sales (Preise, Angebote, Pakete, Kosten), faq (allgemeine Fragen, Passwort, Account, Anleitungen), unknown (unklar). Bewerte Dringlichkeit 1-10. Antworte NUR als JSON ohne Markdown.',
                },
            ],
        },
    };

    @node({
        id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80',
        name: 'Kategorie parsen',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [550, 400],
    })
    KategorieParsen = {
        mode: 'runOnceForEachItem',
        language: 'javaScript',
        jsCode: `const raw = $json.text || $json.response || "";
const start = raw.indexOf('{');
const end = raw.lastIndexOf('}');
let category = 'unknown', urgency = 5, summary = '';
if (start >= 0 && end > start) {
  try {
    const parsed = JSON.parse(raw.substring(start, end + 1));
    category = (parsed.category || 'unknown').toLowerCase();
    urgency = parseInt(parsed.urgency) || 5;
    summary = parsed.summary || '';
  } catch (e) {}
}
const wb = $('Webhook Eingang').item.json;
return { json: { category, urgency, summary, originalText: wb.body.text || '', originalUser: wb.body.user || '', originalChannel: wb.body.channel || '' } };`,
    };

    @node({
        id: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091',
        name: 'Route Switch',
        type: 'n8n-nodes-base.switch',
        version: 3.4,
        position: [800, 400],
    })
    RouteSwitch = {
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
                                leftValue: '={{ $json.category }}',
                                rightValue: 'tech',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'Tech',
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
                                leftValue: '={{ $json.category }}',
                                rightValue: 'sales',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'Sales',
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
                                leftValue: '={{ $json.category }}',
                                rightValue: 'faq',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'FAQ',
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
                                leftValue: '={{ $json.category }}',
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
                    outputKey: 'Fallback',
                },
            ],
        },
        options: {},
    };

    @node({
        id: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8091a2',
        name: 'Tech Gemini',
        type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
        version: 1,
        position: [1100, 200],
        credentials: { googlePalmApi: { id: 'FVE8T8mYCgIRpSyv', name: 'Google Gemini' } },
    })
    TechGemini = {
        modelName: 'models/gemini-2.0-flash',
        options: {
            temperature: 0.3,
        },
    };

    @node({
        id: 'a7b8c9d0-e1f2-4a3b-4c5d-6e7f8091a2b3',
        name: 'Tech-Spezialist',
        type: '@n8n/n8n-nodes-langchain.chainLlm',
        version: 1.9,
        position: [1100, 50],
    })
    TechSpezialist = {
        promptType: 'define',
        text: `={{ \`Bearbeite diese technische Support-Anfrage:

Anfrage: \${$json.originalText}
User: \${$json.originalUser}
Kanal: \${$json.originalChannel}
Dringlichkeit: \${$json.urgency}/10
Zusammenfassung: \${$json.summary}\` }}`,
        messages: {
            messageValues: [
                {
                    type: 'SystemMessagePromptTemplate',
                    message:
                        'Du bist ein erfahrener technischer Support-Spezialist. Analysiere technische Probleme wie Server-Fehler, API-Probleme, Performance-Issues und Code-Bugs. Gib konkrete Loesungsvorschlaege mit Schritten. Antworte auf Deutsch, strukturiert und praezise.',
                },
            ],
        },
    };

    @node({
        id: 'b8c9d0e1-f2a3-4b4c-5d6e-7f8091a2b3c4',
        name: 'Sales Gemini',
        type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
        version: 1,
        position: [1100, 500],
        credentials: { googlePalmApi: { id: 'FVE8T8mYCgIRpSyv', name: 'Google Gemini' } },
    })
    SalesGemini = {
        modelName: 'models/gemini-2.0-flash',
        options: {
            temperature: 0.5,
        },
    };

    @node({
        id: 'c9d0e1f2-a3b4-4c5d-6e7f-8091a2b3c4d5',
        name: 'Sales-Spezialist',
        type: '@n8n/n8n-nodes-langchain.chainLlm',
        version: 1.9,
        position: [1100, 350],
    })
    SalesSpezialist = {
        promptType: 'define',
        text: `={{ \`Bearbeite diese Sales-Anfrage:

Anfrage: \${$json.originalText}
User: \${$json.originalUser}
Kanal: \${$json.originalChannel}
Zusammenfassung: \${$json.summary}\` }}`,
        messages: {
            messageValues: [
                {
                    type: 'SystemMessagePromptTemplate',
                    message:
                        'Du bist ein Sales-Spezialist. Beantworte Fragen zu Preisen, Paketen und Angeboten. Unsere Preise: Starter 29 EUR/Monat (5 User), Professional 79 EUR/Monat (20 User), Enterprise 199 EUR/Monat (unbegrenzt). Bei mehr als 50 Usern gibt es 15% Rabatt. Sei freundlich und ueberzeugend. Antworte auf Deutsch.',
                },
            ],
        },
    };

    @node({
        id: 'd0e1f2a3-b4c5-4d6e-7f80-91a2b3c4d5e6',
        name: 'FAQ Gemini',
        type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
        version: 1,
        position: [1100, 800],
        credentials: { googlePalmApi: { id: 'FVE8T8mYCgIRpSyv', name: 'Google Gemini' } },
    })
    FaqGemini = {
        modelName: 'models/gemini-2.0-flash',
        options: {
            temperature: 0.3,
        },
    };

    @node({
        id: 'e1f2a3b4-c5d6-4e7f-8091-a2b3c4d5e6f7',
        name: 'FAQ-Spezialist',
        type: '@n8n/n8n-nodes-langchain.chainLlm',
        version: 1.9,
        position: [1100, 650],
    })
    FaqSpezialist = {
        promptType: 'define',
        text: `={{ \`Bearbeite diese FAQ-Anfrage:

Anfrage: \${$json.originalText}
User: \${$json.originalUser}
Kanal: \${$json.originalChannel}
Zusammenfassung: \${$json.summary}\` }}`,
        messages: {
            messageValues: [
                {
                    type: 'SystemMessagePromptTemplate',
                    message:
                        'Du bist ein FAQ-Spezialist. Beantworte allgemeine Fragen zu: Passwort zuruecksetzen (Link unter Einstellungen > Sicherheit), Account loeschen (Support kontaktieren), Datenexport (Einstellungen > Daten > Export), Zahlungsmethoden (Kreditkarte, PayPal, Ueberweisung), Support-Zeiten (Mo-Fr 9-18 Uhr). Halte Antworten kurz und hilfreich. Antworte auf Deutsch.',
                },
            ],
        },
    };

    @node({
        id: 'f2a3b4c5-d6e7-4f80-91a2-b3c4d5e6f7a8',
        name: 'Fallback-Antwort',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [1100, 1000],
    })
    FallbackAntwort = {
        mode: 'runOnceForEachItem',
        language: 'javaScript',
        jsCode: 'return { json: { text: "Ich konnte Ihre Anfrage leider nicht eindeutig zuordnen. Bitte beschreiben Sie Ihr Anliegen genauer oder wenden Sie sich direkt an unseren Support unter support@firma.de. Unsere Support-Zeiten sind Mo-Fr 9-18 Uhr." } };',
    };

    @node({
        id: 'a3b4c5d6-e7f8-4091-a2b3-c4d5e6f7a8b9',
        name: 'Qualitaets-Check',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [1400, 400],
    })
    QualitaetsCheck = {
        mode: 'runOnceForEachItem',
        language: 'javaScript',
        jsCode: `const antwort = $json.text || $json.response || "";
const kat = $('Kategorie parsen').item.json;
const urgency = kat.urgency || 5;
const category = kat.category || 'unknown';
let score = 5;
if (antwort.length > 100) score += 2;
if (antwort.length > 300) score += 1;
if (antwort.length < 20) score -= 3;
score = Math.max(1, Math.min(10, score));
return { json: { antwort: antwort, kategorie: category, dringlichkeit: urgency, qualitaetsScore: score, user: kat.originalUser || 'unbekannt', channel: kat.originalChannel || 'unbekannt', zusammenfassung: kat.summary || '', timestamp: new Date().toISOString() } };`,
    };

    @node({
        id: 'b4c5d6e7-f809-41a2-b3c4-d5e6f7a8b9c0',
        name: 'Dringlichkeit Filter',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [1700, 400],
    })
    DringlichkeitFilter = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'loose',
            },
            conditions: [
                {
                    leftValue: '={{ $json.dringlichkeit }}',
                    rightValue: 7,
                    operator: {
                        type: 'number',
                        operation: 'gt',
                    },
                },
            ],
            combinator: 'and',
        },
        looseTypeValidation: true,
        options: {},
    };

    @node({
        id: 'c5d6e7f8-091a-42b3-c4d5-e6f7a8b9c0d1',
        name: 'Telegram Alert',
        type: 'n8n-nodes-base.telegram',
        version: 1.2,
        position: [2000, 250],
        credentials: { telegramApi: { id: 'nzmbw9ZNGZdA9sZp', name: 'Telegram Bot' } },
    })
    TelegramAlert = {
        resource: 'message',
        operation: 'sendMessage',
        chatId: '443039215',
        text: '={{ "DRINGEND [" + $json.kategorie.toUpperCase() + "]\\n" + $json.user + " | " + $json.channel + "\\nDringlichkeit: " + $json.dringlichkeit + "/10 | Qualitaet: " + $json.qualitaetsScore + "/10\\n\\n" + ($json.antwort || "").split("*").join("").split("`").join("").split("_").join("").substring(0, 200) }}',
        additionalFields: {},
    };

    @node({
        id: 'd6e7f809-1a2b-43c4-d5e6-f7a8b9c0d1e2',
        name: 'Antwort senden',
        type: 'n8n-nodes-base.respondToWebhook',
        version: 1.1,
        position: [2000, 550],
    })
    AntwortSenden = {
        respondWith: 'json',
        responseBody: '={{ $("Qualitaets-Check").first().json }}',
        options: {},
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.WebhookEingang.out(0).to(this.DispatcherKlassifizierung.in(0));
        this.DispatcherKlassifizierung.out(0).to(this.KategorieParsen.in(0));
        this.KategorieParsen.out(0).to(this.RouteSwitch.in(0));
        this.RouteSwitch.out(0).to(this.TechSpezialist.in(0));
        this.RouteSwitch.out(1).to(this.SalesSpezialist.in(0));
        this.RouteSwitch.out(2).to(this.FaqSpezialist.in(0));
        this.RouteSwitch.out(3).to(this.FallbackAntwort.in(0));
        this.TechSpezialist.out(0).to(this.QualitaetsCheck.in(0));
        this.SalesSpezialist.out(0).to(this.QualitaetsCheck.in(0));
        this.FaqSpezialist.out(0).to(this.QualitaetsCheck.in(0));
        this.FallbackAntwort.out(0).to(this.QualitaetsCheck.in(0));
        this.QualitaetsCheck.out(0).to(this.DringlichkeitFilter.in(0));
        this.DringlichkeitFilter.out(0).to(this.TelegramAlert.in(0));
        this.DringlichkeitFilter.out(1).to(this.AntwortSenden.in(0));
        this.TelegramAlert.out(0).to(this.AntwortSenden.in(0));

        this.DispatcherKlassifizierung.uses({
            ai_languageModel: this.DispatcherGemini.output,
        });
        this.TechSpezialist.uses({
            ai_languageModel: this.TechGemini.output,
        });
        this.SalesSpezialist.uses({
            ai_languageModel: this.SalesGemini.output,
        });
        this.FaqSpezialist.uses({
            ai_languageModel: this.FaqGemini.output,
        });
    }
}
