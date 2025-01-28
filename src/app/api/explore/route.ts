import { NextRequest } from 'next/server';
import { generateTopicExploration } from '@/lib/claude';
import { loadingMessages } from '@/lib/loadingStates';

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

export async function POST(request: NextRequest) {
  console.log('API route called');
  
  try {
    const body = await request.json();
    console.log('Request body:', body);

    const { topic, parentId, depth } = body;

    // Create encoder for sending events
    const encoder = new TextEncoder();

    // Create a transform stream
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Function to send SSE messages with proper formatting
    const sendEvent = async (type: string, data: any) => {
      const event = `data: ${JSON.stringify({ type, ...data })}\n\n`;
      console.log('Sending event:', event.trim());
      await writer.write(encoder.encode(event));
    };

    // Create the response with appropriate headers
    const response = new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

    // Start the exploration process in the background
    (async () => {
      try {
        // Send initial progress
        await sendEvent('progress', { message: loadingMessages.initial, progress: 0 });

        const result = await generateTopicExploration(
          topic,
          parentId ? `${parentId} > ${topic}` : topic,
          async (message: string, progress: number) => {
            await sendEvent('progress', { message, progress });
          }
        );

        // Send the final result
        await sendEvent('data', { result });
        
        // Send completion event
        await sendEvent('progress', { message: loadingMessages.complete, progress: 100 });
      } catch (error) {
        console.error('Error during exploration:', error);
        await sendEvent('error', { 
          message: error instanceof Error ? error.message : loadingMessages.error 
        });
      } finally {
        // Close the stream
        await writer.close();
      }
    })();

    return response;
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }), 
      { status: 500 }
    );
  }
} 