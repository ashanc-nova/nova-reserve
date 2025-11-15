# Environment Configuration

This directory contains environment-specific configuration files for different deployment environments.

## Configuration Files

- `qa03.json` - Configuration for QA03 environment
- `prod.json` - Configuration for Production environment

## How It Works

The configuration system loads the appropriate JSON file based on the `VITE_ENV` environment variable:

- Set `VITE_ENV=qa03` to use `qa03.json`
- Set `VITE_ENV=prod` to use `prod.json`
- If `VITE_ENV` is not set or is any other value, it defaults to development mode (uses environment variables directly)

## Configuration Structure

Each JSON file should contain:

```json
{
  "supabaseUrl": "your-supabase-url",
  "supabaseAnonKey": "your-supabase-anon-key",
  "openaiApiKey": "your-openai-api-key (optional)",
  "apiBaseUrl": "your-api-base-url (optional)",
  "environment": "qa03" or "prod"
}
```

## Environment Variables Override

Environment variables (e.g., `VITE_SUPABASE_URL`) will override values in the JSON files if they are set. This allows for flexibility in deployment scenarios.

## Usage

The configuration is automatically loaded when you import from `src/lib/config.ts`:

```typescript
import { config } from './lib/config'

// Use config values
const url = config.supabaseUrl
const apiKey = config.openaiApiKey
```

## Setting Environment for Build

### Development
```bash
# No VITE_ENV needed, uses environment variables
npm run dev
```

### QA03
```bash
VITE_ENV=qa03 npm run build
```

### Production
```bash
VITE_ENV=prod npm run build
```

## Notes

- The JSON files are imported at build time, so changes require a rebuild
- Environment variables take precedence over JSON file values
- For development, you can continue using `.env` files with `VITE_*` variables

