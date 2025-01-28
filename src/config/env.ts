export const env = {
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY as string,
  CLAUDE_API_URL: process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages',
} as const;

// Validate environment variables
if (!env.CLAUDE_API_KEY) {
  throw new Error('CLAUDE_API_KEY environment variable is not set');
}

if (!env.CLAUDE_API_KEY.startsWith('sk-ant-api')) {
  throw new Error('CLAUDE_API_KEY appears to be invalid. It should start with "sk-ant-api"');
}

// No need to validate CLAUDE_API_URL as we have a default value 