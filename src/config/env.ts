export const env = {
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY as string,
  CLAUDE_API_URL: process.env.CLAUDE_API_URL as string,
} as const;

// Validate environment variables
if (!env.CLAUDE_API_KEY) {
  throw new Error('CLAUDE_API_KEY environment variable is not set');
}

if (!env.CLAUDE_API_URL) {
  throw new Error('CLAUDE_API_URL environment variable is not set');
} 