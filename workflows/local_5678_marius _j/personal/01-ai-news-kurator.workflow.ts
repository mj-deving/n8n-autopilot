import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : WF1 - AI News-Kurator
// Nodes   : 10  |  Connections: 10
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// JedenMorgen7Uhr                    scheduleTrigger
// RssTech                            rssFeedRead
// RssAi                              rssFeedRead
// RssBusiness                        rssFeedRead
// FeedsZusammenfuehren               merge
// Max15Artikel                       limit
// GeminiFlash                        lmChatGoogleGemini         [creds] [ai_languageModel]
// AiArtikelAnalyse                   chainLlm                   [AI]
// Top5Digest                         code
// TelegramDigest                     telegram                   [creds]
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// JedenMorgen7Uhr
//    → RssTech
//      → FeedsZusammenfuehren
//        → Max15Artikel
//          → AiArtikelAnalyse
//            → Top5Digest
//              → TelegramDigest
//    → RssAi
//      → FeedsZusammenfuehren.in(1) (↩ loop)
//    → RssBusiness
//      → FeedsZusammenfuehren.in(1) (↩ loop)
//
// AI CONNECTIONS
// AiArtikelAnalyse.uses({ ai_languageModel: GeminiFlash })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: '5bWFv8sC4a3OvMgP',
    name: 'WF1 - AI News-Kurator',
    active: false,
    settings: { executionOrder: 'v1', callerPolicy: 'workflowsFromSameOwner', availableInMCP: false },
})
export class Wf1AiNewsKuratorWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: 'd5d19a6a-dca1-4758-8d49-0877d65faaf3',
        name: 'Jeden Morgen 7 Uhr',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.3,
        position: [0, 300],
    })
    JedenMorgen7Uhr = {
        rule: {
            interval: [
                {
                    field: 'cronExpression',
                    expression: '0 7 * * *',
                },
            ],
        },
    };

    @node({
        id: '184916c1-58bc-498d-8626-d1811ae528d6',
        name: 'RSS Tech',
        type: 'n8n-nodes-base.rssFeedRead',
        version: 1.2,
        position: [250, 100],
    })
    RssTech = {
        url: 'https://feeds.arstechnica.com/arstechnica/index',
    };

    @node({
        id: 'c2d33aab-61a1-4ffa-afde-9ff7f8a8c997',
        name: 'RSS AI',
        type: 'n8n-nodes-base.rssFeedRead',
        version: 1.2,
        position: [250, 300],
    })
    RssAi = {
        url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    };

    @node({
        id: 'ca9fde9e-2169-44e9-a9ea-39901d4a7ac1',
        name: 'RSS Business',
        type: 'n8n-nodes-base.rssFeedRead',
        version: 1.2,
        position: [250, 500],
    })
    RssBusiness = {
        url: 'https://feeds.feedburner.com/TheHackersNews',
    };

    @node({
        id: '1a0a2a76-a645-45ef-99d8-4ff8ec92f02d',
        name: 'Feeds zusammenfuehren',
        type: 'n8n-nodes-base.merge',
        version: 3.1,
        position: [500, 300],
    })
    FeedsZusammenfuehren = {
        mode: 'append',
        options: {},
    };

    @node({
        id: '5cc42a4a-2b9d-42db-bc37-0b661305c44e',
        name: 'Max 15 Artikel',
        type: 'n8n-nodes-base.limit',
        version: 1,
        position: [700, 300],
    })
    Max15Artikel = {
        maxItems: 15,
        keep: 'firstItems',
    };

    @node({
        id: 'baef04fa-234e-46a6-b0b6-4ba25dde271a',
        name: 'Gemini Flash',
        type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
        version: 1,
        position: [900, 500],
        credentials: { googlePalmApi: { id: 'FVE8T8mYCgIRpSyv', name: 'Google Gemini' } },
    })
    GeminiFlash = {
        modelName: 'models/gemini-2.0-flash',
        options: {
            temperature: 0.3,
        },
    };

    @node({
        id: '15f75893-376f-422b-b4b0-84e517a23e5b',
        name: 'AI Artikel-Analyse',
        type: '@n8n/n8n-nodes-langchain.chainLlm',
        version: 1.9,
        position: [900, 300],
    })
    AiArtikelAnalyse = {
        promptType: 'define',
        text: `={{ \`Bewerte diesen Artikel (1-10 Score) und fasse ihn in 2 Saetzen auf Deutsch zusammen.

Titel: \${$json.title}
Beschreibung: \${$json.contentSnippet || $json.description || "keine"}

Antworte NUR als JSON: {"score": 8, "zusammenfassung": "...", "kategorie": "Tech|AI|Security|Business"}\` }}`,
        messages: {
            messageValues: [
                {
                    type: 'SystemMessagePromptTemplate',
                    message:
                        'Du bist ein Tech-News-Kurator. Antworte immer als reines JSON ohne Markdown-Codeblock und ohne sonstigen Text.',
                },
            ],
        },
    };

    @node({
        id: 'b187fb56-d2a6-483c-91af-2220d7ec6b45',
        name: 'Top 5 Digest',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [1150, 300],
    })
    Top5Digest = {
        mode: 'runOnceForAllItems',
        language: 'javaScript',
        jsCode: `const articles = [];
for (const item of $input.all()) {
  const raw = item.json.text || item.json.response || "";
  try {
    const match = raw.match(/\\{[\\s\\S]*\\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      articles.push({
        score: parsed.score || 0,
        zusammenfassung: parsed.zusammenfassung || "",
        kategorie: parsed.kategorie || "",
        titel: item.json.title || "",
        link: item.json.link || "",
      });
    }
  } catch (e) {}
}
articles.sort((a, b) => b.score - a.score);
const top5 = articles.slice(0, 5);
const datum = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
let msg = "AI News Digest " + datum + "\\n\\n";
top5.forEach((a, i) => {
  msg += (i + 1) + ". [" + a.score + "/10] " + a.kategorie + "\\n";
  msg += a.zusammenfassung + "\\n";
  if (a.link) msg += a.link + "\\n";
  msg += "\\n";
});
if (top5.length === 0) {
  msg += "Keine relevanten Artikel gefunden.";
}
return [{ json: { digest: msg, articleCount: top5.length } }];`,
    };

    @node({
        id: 'b0a118b5-7006-4fbf-ae81-433d77b3f8b8',
        name: 'Telegram Digest',
        type: 'n8n-nodes-base.telegram',
        version: 1.2,
        position: [1400, 300],
        credentials: { telegramApi: { id: 'nzmbw9ZNGZdA9sZp', name: 'Telegram Bot' } },
    })
    TelegramDigest = {
        resource: 'message',
        operation: 'sendMessage',
        chatId: '443039215',
        text: '={{ $json.digest }}',
        additionalFields: {},
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.JedenMorgen7Uhr.out(0).to(this.RssTech.in(0));
        this.JedenMorgen7Uhr.out(0).to(this.RssAi.in(0));
        this.JedenMorgen7Uhr.out(0).to(this.RssBusiness.in(0));
        this.RssTech.out(0).to(this.FeedsZusammenfuehren.in(0));
        this.RssAi.out(0).to(this.FeedsZusammenfuehren.in(1));
        this.RssBusiness.out(0).to(this.FeedsZusammenfuehren.in(1));
        this.FeedsZusammenfuehren.out(0).to(this.Max15Artikel.in(0));
        this.Max15Artikel.out(0).to(this.AiArtikelAnalyse.in(0));
        this.AiArtikelAnalyse.out(0).to(this.Top5Digest.in(0));
        this.Top5Digest.out(0).to(this.TelegramDigest.in(0));

        this.AiArtikelAnalyse.uses({
            ai_languageModel: this.GeminiFlash.output,
        });
    }
}
