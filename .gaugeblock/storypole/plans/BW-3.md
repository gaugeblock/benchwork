# GB-37: OpenAI-Compatible / Custom Provider & 2-Step Dynamic Model Discovery in Benchwork

## 1. Overview & Context

Users needing custom inference providers (such as Cline, OpenRouter, vLLM, LiteLLM, LM Studio, Ollama OpenAI endpoints, or self-hosted API gateways) require:
1. An explicit **"Custom / OpenAI-Compatible (Cline, OpenRouter, etc.)"** option in Benchwork's Model Configuration Hub.
2. A streamlined **2-Step Configurator Workflow**:
   - **Step 1 (Endpoint & Auth):** User inputs Base URL and API Key / API Key Env -> clicks **"Connect & Discover Models"**.
   - **Step 2 (Model Selection & Verification):** The backend queries the provider's standard `/v1/models` endpoint, populates a searchable/filterable dropdown with the models exposed by that key/endpoint, allows one-click selection (or custom text override), runs test inference, and saves to `sawhorse.toml` / `.gaugeblock/config.toml`.

---

## 2. Architecture & Data Contracts

### A. Backend Discovery Endpoint (`benchwork-core` & `benchwork-cli`)
- Endpoint: `POST /api/v1/hub/models/discover`
- Request Payload:
  ```json
  {
    "base_url": "https://api.cline.bot/v1",
    "api_key": "...",
    "api_key_env": "CLINE_API_KEY",
    "provider": "custom_openai"
  }
  ```
- Implementation:
  - Resolves API key: `api_key` direct value or reads `std::env::var(api_key_env)`.
  - Normalizes base URL: ensures trailing slashes/paths route correctly to `/models` or `/v1/models`.
  - Dispatches `GET` with `Authorization: Bearer <token>` and `User-Agent: gaugeblock-benchwork/0.1.0`.
  - Deserializes standard OpenAI models payload `{ "data": [ { "id": "model_id" } ] }`.
  - Returns `{ "success": true, "models": ["model1", "model2", ...], "count": N }`.
  - If discovery fails (e.g. endpoint doesn't support `/models`), returns clean fallback message without crashing, enabling manual text input.

### B. Frontend UI Overhaul (`UniversalConfigModal.tsx`)
- Add `Custom / OpenAI-Compatible (Cline, OpenRouter)` preset.
- State machine for 2-step setup:
  - `step: 'connect' | 'select' | 'override'`
  - Live model search filter in the dropdown.
  - "Direct API Key" input with masked eye toggle, and "Save to Env Var" helper.
  - Preserves and synchronizes universal fallback mode and per-role overrides.

---

## 3. Execution Steps

1. **S1: Backend Discovery Function in `benchwork-core`:**
   - Add `discover_remote_models` in `benchwork-core::hub_service` or `sawhorse-core`.
   - Unit tests mocking/testing URL normalization and JSON parsing.
2. **S2: Daemon REST Endpoint in `benchwork-cli`:**
   - Expose `POST /api/v1/hub/models/discover` in `routes_synth.rs`.
   - Test CLI/daemon route integration.
3. **S3: Frontend 2-Step Configurator in `benchwork/web`:**
   - Update `UniversalConfigModal.tsx` and `api/client.ts`.
   - Add searchable model combobox and connection probe.
   - Run `npm run build`.
4. **S4: Verification & Dogfooding:**
   - Tier 1-3 verification gates.
   - `storypole verify GB-37`.
   - Merge to `main`.
