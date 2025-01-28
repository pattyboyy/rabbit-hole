import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generateTopicExploration } from '@/lib/claude';

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
  try {
    // Validate request body
    const body = await request.json().catch(() => null);
    if (!body?.topic) {
      return NextResponse.json(
        { error: 'Missing required field: topic' },
        { status: 400 }
      );
    }

    const { topic, parentId, depth = 0 } = body;

    console.log('Processing exploration request:', { topic, parentId, depth });

    const exploration = await generateTopicExploration(
      topic,
      depth > 0 ? `This is a subtopic of: ${parentId}` : ''
    );

    // Construct the response with enhanced data
    const explorationData = {
      id: uuidv4(),
      title: topic,
      summary: exploration.summary,
      subtopics: exploration.subtopics.map((st: any) => ({
        id: uuidv4(),
        title: st.title,
        description: st.description,
        keyTerms: st.keyTerms?.map((term: any) => ({
          name: term.name,
          definition: term.definition
        })) || [],
        examples: st.examples?.map((ex: any) => ({
          title: ex.title,
          description: ex.description
        })) || [],
        exploreDeeper: st.exploreDeeper?.map((path: any) => ({
          title: path.title,
          description: path.description,
          concepts: path.concepts,
          relevantTopics: path.relevantTopics,
          researchAreas: path.researchAreas
        })) || []
      })),
      connections: exploration.connections?.map((conn: any) => ({
        id: uuidv4(),
        title: conn.title,
        description: conn.description
      })) || [],
      depth
    };

    console.log('Exploration data:', JSON.stringify(explorationData, null, 2));
    return NextResponse.json(explorationData);
  } catch (error) {
    console.error('Error in explore API:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }

    // Return a more specific error message if possible
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 