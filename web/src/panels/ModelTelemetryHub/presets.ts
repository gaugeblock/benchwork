export interface ProviderPreset {
  mode: string;
  baseUrl: string;
  env: string;
  model: string;
}

export const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  'Custom / OpenAI-Compatible (Cline, OpenRouter)': {
    mode: 'openai_compatible',
    baseUrl: 'https://api.cline.bot/v1',
    env: 'CLINE_API_KEY',
    model: '',
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
