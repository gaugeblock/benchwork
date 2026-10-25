export interface ProviderPreset {
  mode: string;
  baseUrl: string;
  env: string;
  model: string;
}

export const CLINEPASS_MODELS = [
  'cline-pass/deepseek-v4-pro',
  'cline-pass/deepseek-v4.1-flash',
  'cline-pass/glm-5.3',
  'cline-pass/glm-5.3-flash',
  'cline-pass/kimi-k3',
  'cline-pass/qwen3.8-max',
  'cline-pass/qwen3.7-max',
  'cline-pass/qwen3.7-plus',
  'cline-pass/mimo-v2.5',
  'cline-pass/mimo-v2.5-pro',
  'cline-pass/minimax-m3',
  'cline-pass/muse-spark-1.3-contributor',
];

export const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  ClinePass: {
    mode: 'openai_compatible',
    baseUrl: 'https://api.cline.bot/api/v1',
    env: 'CLINE_API_KEY',
    model: 'cline-pass/deepseek-v4-pro',
  },
  'Custom / OpenAI-Compatible (Cline, OpenRouter)': {
    mode: 'openai_compatible',
    baseUrl: 'https://api.cline.bot/api/v1',
    env: 'CLINE_API_KEY',
    model: 'cline-pass/deepseek-v4-pro',
  },
  DeepSeek: {
    mode: 'openai_compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    env: 'DEEPSEEK_API_KEY',
    model: 'deepseek-coder',
  },
  Anthropic: {
    mode: 'openai_compatible',
    baseUrl: 'https://api.anthropic.com/v1',
    env: 'ANTHROPIC_API_KEY',
    model: 'claude-3-5-sonnet-20241022',
  },
  OpenAI: {
    mode: 'openai_compatible',
    baseUrl: 'https://api.openai.com/v1',
    env: 'OPENAI_API_KEY',
    model: 'gpt-4o',
  },
  'Google Gemini': {
    mode: 'openai_compatible',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    env: 'GEMINI_API_KEY',
    model: 'gemini-1.5-pro',
  },
  'Ollama / Local GGUF': {
    mode: 'local_runtime',
    baseUrl: 'http://127.0.0.1:11434',
    env: '',
    model: 'qwen2.5-coder:7b',
  },
  'In-House Candle': {
    mode: 'in_house_candle',
    baseUrl: 'weights.safetensors',
    env: '',
    model: 'candle-micro-router',
  },
};
