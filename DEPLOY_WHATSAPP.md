WhatsApp API Recommendation: Evolution API vs WAHA
===================================================

Recommendation: Evolution API (v2.x) — for this hospital system.

Why Evolution API over WAHA:
=============================

| Factor                  | Evolution API                    | WAHA                          |
|-------------------------|----------------------------------|-------------------------------|
| Stars / Community       | 9k stars, 6.9k forks            | ~2k stars                     |
| Docker Hub              | evoapicloud/evolution-api       | devlikeapro/waha              |
| Language                | TypeScript (same stack as us)   | TypeScript                    |
| Database                | PostgreSQL / MySQL (Prisma)     | MongoDB (or none)             |
| WhatsApp engines        | Baileys (Web) + Cloud API (Meta)| Baileys only                  |
| Webhook events          | messages.update, status events  | Similar                       |
| Message send API        | POST /message/sendText          | POST /api/sendText            |
| Auth                    | apikey header                   | apikey header (optional)      |
| Multi-instance          | Yes (session management)        | Yes                           |
| Integrations            | Typebot, Chatwoot, OpenAI, etc. | n8n, Typebot, Chatwoot       |
| Health check            | Built-in                         | Built-in                      |
| Our code matches        | Already coded for Evolution     | Would need adapter rewrite    |

Decision:
- Our whatsapp.ts is already written against Evolution API's endpoint
  format (POST /message/sendText, apikey header, messages.update webhooks).
- Evolution API has 4x more community adoption and runs on PostgreSQL
  (same as our app), making it the safer enterprise choice.
- Evolution API offers WhatsApp Cloud API (official Meta) as a future
  upgrade path if the hospital wants official Meta business messaging.


Coolify Deployment for Evolution API:
======================================

Step 1: Create a new Application service in Coolify:
  - Type: Application
  - Docker image: evoapicloud/evolution-api:latest
    (OR build from GitHub: evolution-foundation/evolution-api)
  - Port: 8080

Step 2: Environment Variables for Evolution API:
  | AUTHENTICATION_API_KEY      | YOUR_EVOLUTION_API_KEY                     |
  | DATABASE_ENABLED           | true                                       |
  | DATABASE_PROVIDER          | postgresql                                 |
  | DATABASE_CONNECTION_URI    | postgresql://user:pass@host:5432/evo_db    |
  | DATABASE_CONNECTION_CLIENT | evolution_api                              |
  | LOG_LEVEL                  | INFO                                       |
  | LANGUAGE                   | ar (optional, Arabic interface)            |

  Or for simple deployment (no DB):
  | AUTHENTICATION_API_KEY      | YOUR_EVOLUTION_API_KEY                     |
  | DATABASE_ENABLED           | false                                      |
  | LOG_LEVEL                  | INFO                                       |

Step 3: After deployment, access Evolution Manager UI:
  - https://<your-coolify-domain>/manager
  - Default login: admin / admin (change immediately)
  - Create a new instance (session) for the hospital WhatsApp number
  - Scan QR code with that WhatsApp number to pair
  - Get the instance API key from the Manager UI

Step 4: Link to our app:
  | EVOLUTION_API_URL      | http://evolution-api-service:8080/message/sendText/<instance> |
  | EVOLUTION_API_KEY      | <the instance API key from Evolution Manager>                  |
  | EVOLUTION_WEBHOOK_SECRET | <set a shared secret>                                         |

  Our POST /api/whatsapp/webhook receives Evolution's webhook callbacks.
  Configure the webhook URL in Evolution Manager:
    Webhook URL: https://api.example.com/api/whatsapp/webhook
    Events: messages.update

Step 5: Network linking in Coolify:
  - Connect the Evolution API service to the same internal Docker network
    as the backend and PostgreSQL services.
  - This allows the backend to reach Evolution API at its internal
    service name (e.g., "evolution-api").


WAHA Installation (Alternative, if you prefer):
================================================

  Docker image: devlikeapro/waha:latest
  Port: 3000

  Key differences from Evolution:
  - WAHA uses MongoDB, not PostgreSQL (extra service needed)
  - Send endpoint: POST /api/sendText (we'd need to adapt whatsapp.ts)
  - Auth: apikey header (similar)
  - Webhook format: Similar messages.update shape

  If using WAHA, update these lines in src/server/services/whatsapp.ts:
    - Line 27: Change EVOLUTION_API_URL to point to WAHA endpoint
    - Line 32: Change body format to match WAHA's sendText schema

  The verification stub in verifyWebhookSignature() works with both
  as both use x-hub-signature-256 / x-evolution-signature patterns.


WhatsApp Number Setup (regardless of API choice):
=================================================
  1. Obtain a dedicated WhatsApp number (+966... Saudi Arabia)
  2. Register it on a phone with WhatsApp Business
  3. In Evolution API Manager (or WAHA Dashboard), create a session
  4. Scan the QR code from that phone's WhatsApp → Linked Devices
  5. The session pairs and becomes ready for API calls
  6. Test: send a message via the API → it goes through that number