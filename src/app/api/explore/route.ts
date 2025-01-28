import { NextRequest, NextResponse } from 'next/server';
import { generateTopicExploration } from '@/lib/claude';
import { loadingMessages } from '@/lib/loadingStates';
import { PathHistory } from '@/types';

// Assuming the structure of subtopics and connections
interface Subtopic {
  id: string;
  title: string;
  description: string;
  keyTerms: Array<{
    name: string;
    definition: string;
  }>;
  examples: Array<{
    title: string;
    description: string;
  }>;
}

interface Connection {
  id: string;
  title: string;
  description: string;
  examples: string[];
  research: string;
}

interface Context {
  historical: {
    evolution: string;
    keyEvents: Array<{
      date: string;
      description: string;
    }>;
  };
  current: {
    state: string;
    trends: string;
    challenges: string;
  };
  cultural: {
    perspectives: string;
    impact: string;
  };
}

interface ExpertOpinion {
  id: string;
  expert: string;
  quote: string;
  context: string;
  source: string;
}

interface Application {
  id: string;
  title: string;
  description: string;
  caseStudy: string;
  challenges: string;
  solutions: string;
}

// Define allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003'
];

// Define CORS headers with origin checking
function getCorsHeaders(origin: string | null) {
  // Check if the origin is allowed
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, anthropic-version, x-api-key',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, { 
    status: 204,
    headers: getCorsHeaders(origin)
  });
}

export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin');
    
    // Add CORS headers to the response
    const headers = {
      ...getCorsHeaders(origin),
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    };

    const body = await req.json();
    const { topic, depth = 0, pathHistory = [] } = body;

    if (!topic) {
      return new NextResponse(
        JSON.stringify({ error: 'Topic is required' }), 
        { status: 400, headers }
      );
    }

    // Create response stream
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Send progress updates through SSE
    const sendEvent = async (type: string, data: any) => {
      const event = `data: ${JSON.stringify({ type, ...data })}\n\n`;
      await writer.write(encoder.encode(event));
    };

    // Start processing in the background
    (async () => {
      try {
        console.log('API route called');
        console.log('Request body:', body);
        console.log('Origin:', origin);

        const result = await generateTopicExploration(
          topic,
          '',
          (message: string, progress: number) => {
            sendEvent('progress', { message, progress });
          },
          pathHistory as PathHistory[]
        );

        // Send the final result
        await sendEvent('data', { result });
        await sendEvent('progress', { message: 'Exploration complete!', progress: 100 });
      } catch (error) {
        console.error('Error during exploration:', error);
        await sendEvent('error', { 
          message: error instanceof Error ? error.message : 'An unknown error occurred' 
        });
      } finally {
        await writer.close();
      }
    })();

    return new NextResponse(stream.readable, { headers });
  } catch (error) {
    console.error('Error in API route:', error);
    const origin = req.headers.get('origin');
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: getCorsHeaders(origin) }
    );
  }
} 