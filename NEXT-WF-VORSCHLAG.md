# WF5: AI Multi-Agent Support System

> Komplexer Workflow — vollautomatisch baubar und testbar (Webhook-basiert)

---

## Konzept

Ein mehrstufiges AI-Support-System, das eingehende Anfragen (via Webhook) durch
mehrere spezialisierte AI-Agenten schleust. Jeder Agent hat einen Fachbereich und
eigene Tools. Ein Dispatcher-Agent entscheidet, welcher Spezialist zustaendig ist.

```
                         ┌─────────────────────┐
  POST /support ────────>│  Dispatcher-Agent    │
  {text, user, channel}  │  (Gemini + Router)   │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    v               v               v
             ┌────────────┐ ┌────────────┐ ┌────────────┐
             │  Tech-Agent │ │ Sales-Agent│ │ FAQ-Agent  │
             │  (Gemini +  │ │ (Gemini +  │ │ (Gemini +  │
             │  Code Tool) │ │  Calc Tool)│ │  KB Tool)  │
             └──────┬─────┘ └──────┬─────┘ └──────┬─────┘
                    │              │               │
                    v              v               v
             ┌──────────────────────────────────────────┐
             │           Antwort-Aggregator              │
             │  (Code: formatieren + Qualitaets-Score)   │
             └──────────────────┬───────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    v           v           v
              [Telegram]  [Webhook Resp] [Log to Sheet*]
              (wenn       (immer)        (optional,
               dringend)                  spaeter)
```

## Warum komplex?

| Merkmal | Lernwert |
|---------|----------|
| 15+ Nodes | Groesster WF bisher |
| 3 AI Agents | Multi-Agent-Orchestrierung |
| Dispatcher-Pattern | AI entscheidet Routing (nicht Switch) |
| 6+ Code Tools | Jeder Agent hat eigene Faehigkeiten |
| Error Handling | Try/Catch fuer jeden Agent-Zweig |
| Conditional Telegram | Nur bei Dringlichkeit > 7 |
| Qualitaets-Scoring | AI bewertet eigene Antwort |
| Response-Aggregation | Mehrere Ergebnisse zusammenfuehren |

## Nodes (geschaetzt: 16)

```
1.  WebhookEingang          webhook (POST /support)
2.  DispatcherGemini         lmChatGoogleGemini [creds]
3.  DispatcherAgent          chainLlm [AI]
4.  DispatcherParsen         code
5.  RouteSwitch              switch (tech/sales/faq/unknown)
6.  TechGemini               lmChatGoogleGemini [creds]
7.  TechAgent                chainLlm [AI]
8.  SalesGemini              lmChatGoogleGemini [creds]
9.  SalesAgent               chainLlm [AI]
10. FaqGemini                lmChatGoogleGemini [creds]
11. FaqAgent                 chainLlm [AI]
12. AntwortMerge             merge (append)
13. QualitaetsCheck          code (score 1-10, confidence)
14. DringlichkeitFilter      if (score > 7)
15. TelegramAlert            telegram [creds]
16. AntwortSenden            respondToWebhook
```

## Test-Szenarien (alle per Webhook automatisierbar)

```json
// Test 1: Tech-Anfrage
{"text": "Mein Server gibt Error 502 bei /api/users", "user": "admin@firma.de", "channel": "email"}

// Test 2: Sales-Anfrage
{"text": "Was kostet euer Enterprise-Plan fuer 50 User?", "user": "kunde@beispiel.de", "channel": "web"}

// Test 3: FAQ-Anfrage
{"text": "Wie kann ich mein Passwort zuruecksetzen?", "user": "user123", "channel": "chat"}

// Test 4: Unklar/Gemischt
{"text": "Hallo, ich brauche Hilfe", "user": "anonym", "channel": "telegram"}
```

## Automatisierte Pipeline

```bash
# 1. Build & Push
npx n8nac push 05-ai-multi-agent-support.workflow.ts

# 2. Activate + Webhook registrieren
python -c "... activate/deactivate/reactivate ..."

# 3. 4x Test-Payload senden
python -c "... POST /webhook/support ..."

# 4. Ergebnisse pruefen
bash n8n-check.sh <workflowId> 4

# 5. Bei Fehler: fix → push → retest
# 6. Bei Erfolg: commit
```

## Erweiterungen (spaeter)

- Google Sheets Logging (braucht OAuth-Credential)
- Ollama auf VPS als zweites LLM (Fallback bei Gemini Rate-Limit)
- Telegram-Eingang statt nur Webhook
- Memory pro User (Session-basiert)
- Error Workflow mit Retry-Logik

---

## Budget-Check

- Gemini Free Tier: 15 req/min, 1M tokens/day
- WF5 nutzt ~4 Gemini-Calls pro Anfrage (Dispatcher + Spezialist + evtl. Retry)
- Bei 100 Anfragen/Tag: ~400 Calls = weit unter Limit
- Kosten: 0 EUR

---

*Vorschlag erstellt am 2026-03-11*
