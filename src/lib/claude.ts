import { env } from '@/config/env';
import { parseStringPromise } from 'xml2js';
import { LRUCache } from 'lru-cache';
import { loadingMessages } from './loadingStates';
import { PathHistory } from '@/types';

interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

const SENSITIVE_TOPICS_MESSAGE = "This topic involves sensitive or controversial subject matter. While we can explore factual historical and legal information, we'll maintain appropriate boundaries and focus on verified, publicly available information.";

// Initialize LRU cache with a maximum of 100 items that expire after 1 hour
const responseCache = new LRUCache({
  max: 100,
  ttl: 1000 * 60 * 60, // 1 hour
});

// Move XML pattern to top with other constants
const XML_PATTERN = /<exploration>[\s\S]*?<\/exploration>/;
const API_TIMEOUT = 30000; // 30 seconds timeout

function handleSensitiveTopic(topic: string): { isAllowed: boolean; message?: string } {
  const lowercaseTopic = topic.toLowerCase();
  
  // Topics that should be handled with extra care
  if (lowercaseTopic.includes('epstein') || 
      // Add other sensitive topics as needed
      false) {
    return {
      isAllowed: true,
      message: SENSITIVE_TOPICS_MESSAGE
    };
  }

  return { isAllowed: true };
}

export type ProgressCallback = (message: string, progress: number) => void;

export async function generateTopicExploration(
  topic: string, 
  parentContext: string = '',
  onProgress?: ProgressCallback,
  previousPath: PathHistory[] = []
) {
  try {
    // Update progress: Initial
    onProgress?.(loadingMessages.initial, 0);

    const cacheKey = `${topic}-${parentContext}`;
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse) {
      onProgress?.(loadingMessages.complete, 100);
      return cachedResponse;
    }

    // Update progress: Checking topic
    onProgress?.(loadingMessages.processing, 20);

    const { isAllowed, message } = handleSensitiveTopic(topic);
    if (!isAllowed) {
      onProgress?.(loadingMessages.complete, 100);
      return { summary: message, explorePaths: [], connections: [] };
    }

    // Update progress: Fetching
    onProgress?.(loadingMessages.fetching, 40);

    const sensitivityContext = message ? `\n\n${message}` : '';
    
    // Create a more detailed context string that includes the full exploration path
    const pathContext = previousPath.map((p: PathHistory, i: number) => 
      `${i + 1}. ${p.title} (${p.description})`
    ).join('\n');

    const rootTopic = previousPath[0]?.title || topic;
    
    // Build a comprehensive context that includes key information about the topic chain
    const contextString = parentContext ? 
      `EXPLORATION CONTEXT:
Root Topic: ${rootTopic}
Current Topic: "${topic}"
Exploration Path:
${pathContext}
Current Focus: ${parentContext}

TOPIC DEFINITION:
"${topic}" is being explored specifically as a concept within ${rootTopic}. Use this context to inform your response.

IMPORTANT CONTEXT RULES:
1. You have sufficient context to provide a response about "${topic}" within ${rootTopic}
2. Every response MUST be directly related to ${rootTopic}
3. All examples must be from ${rootTopic} lore/universe
4. All exploration paths must maintain direct relevance to ${rootTopic}
5. Do not provide general or real-world examples unless explicitly comparing them to ${rootTopic}
6. Maintain the themes, terminology, and concepts specific to ${rootTopic}
7. Do not question or express uncertainty about the context - use the context provided
8. If a term appears in the exploration path, it is part of ${rootTopic} and should be explained within that context

Your response should read as if it's a dedicated entry in the ${rootTopic} encyclopedia or sourcebook.${sensitivityContext}` 
      : sensitivityContext;

    // Add timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      console.log('Making API request to Claude...', env.CLAUDE_API_URL);
      const response = await fetch(env.CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',  // Corrected API version
          'x-api-key': env.CLAUDE_API_KEY,
          'accept': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          temperature: 0.7,
          system: `You are an expert knowledge exploration assistant specializing in maintaining deep contextual relevance throughout topic chains. 
You MUST ALWAYS respond in valid XML format using the provided template, even if you think you need more context.
Never express uncertainty about the context - if a topic appears in the exploration path, treat it as a valid concept within the root topic's universe.

When exploring subtopics, you must:
1. Keep all content strictly within the context of the root topic
2. Use terminology and examples specific to the topic's universe/domain
3. Maintain thematic consistency with the exploration chain
4. Never drift into general or unrelated topics
5. Treat each response as if writing an entry in the topic's official sourcebook
6. ALWAYS return valid XML with relevant content based on the provided context
7. Never question the validity or existence of terms in the exploration path
8. If a term appears in the context, treat it as canonical to the universe

The XML format is non-negotiable and must be maintained in all responses.
Your role is to explain concepts within their given context, not question their validity.`,
          messages: [{
            role: 'user',
            content: `Explore "${topic}" within the following context:\n\n${contextString}\n\nYou MUST respond using this exact XML format:\n<exploration>\n<summary>Concise summary focused on the current context. If you need more context, include that message here while still providing best-effort exploration.</summary>\n<examples>\n<example><title>Title of relevant example</title><description>Description</description><significance>Why this example matters</significance></example>\n</examples>\n<explorePaths><path><title>Title</title><description>Description</description><concepts>Key concepts and terms</concepts><relevantTopics>Related areas of study</relevantTopics><researchAreas>Research directions</researchAreas></path></explorePaths></exploration>`
          }]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('Received response from Claude:', response.status, response.statusText);

      // Update progress: Processing response
      onProgress?.(loadingMessages.processing, 60);

      let responseText = '';
      try {
        responseText = await response.text();
        console.log('Raw response:', responseText.substring(0, 200) + '...');
        
        if (!response.ok) {
          throw new Error(`API call failed: ${response.status} - ${response.statusText} - ${responseText}`);
        }

        const data: ClaudeResponse = JSON.parse(responseText);
        console.log('Response parsed successfully:', data.content?.[0]?.type);
        
        const xmlContent = data.content?.[0]?.text;
        console.log('XML Content:', xmlContent ? xmlContent.substring(0, 100) + '...' : 'No content');
        
        if (!xmlContent) {
          throw new Error('Invalid response from API: No content received');
        }

        // Update progress: Analyzing
        onProgress?.(loadingMessages.analyzing, 80);

        const xmlMatch = XML_PATTERN.exec(xmlContent);
        if (!xmlMatch) {
          console.error('Failed to match XML pattern. Raw content:', xmlContent);
          throw new Error('Failed to parse XML response: No valid XML found');
        }

        // Update progress: Finalizing
        onProgress?.(loadingMessages.finalizing, 90);

        const result = await parseClaudeResponse(xmlMatch[0]);
        responseCache.set(cacheKey, result);

        // Update progress: Complete
        onProgress?.(loadingMessages.complete, 100);
        
        return result;

      } catch (parseError: unknown) {
        console.error('Error processing response:', parseError);
        console.error('Raw response text:', responseText);
        throw new Error(`Failed to process Claude response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out after 30 seconds');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error) {
    // Update progress: Error
    onProgress?.(loadingMessages.error, 100);
    console.error('Error in generateTopicExploration:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function parseClaudeResponse(xmlContent: string) {
  try {
    // Simplified cleaning
    const cleanXml = xmlContent
      .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;')
      .trim();

    // Streamlined parsing options
    const result = await parseStringPromise(cleanXml, { 
      explicitArray: false,
      mergeAttrs: true,
      normalize: true,
      tagNameProcessors: [(name) => name.toLowerCase()]
    });

    if (!result.exploration?.summary || !result.exploration?.explorepaths?.path) {
      throw new Error('Invalid XML structure: missing required elements');
    }

    const summary = result.exploration.summary;
    
    // Parse examples
    const examples = result.exploration.examples?.example ? 
      (Array.isArray(result.exploration.examples.example) 
        ? result.exploration.examples.example 
        : [result.exploration.examples.example]
      ).map((e: any) => ({
        title: e.title || '',
        description: e.description || '',
        significance: e.significance || ''
      })) 
      : [];
    
    // Ensure path is always an array
    const paths = Array.isArray(result.exploration.explorepaths.path) 
      ? result.exploration.explorepaths.path 
      : [result.exploration.explorepaths.path];

    const explorePaths = paths.map((p: any) => ({
      title: p.title || '',
      description: p.description || '',
      concepts: p.concepts || '',
      relevantTopics: p.relevantTopics || '',
      researchAreas: p.researchAreas || ''
    }));

    return {
      summary,
      examples,
      explorePaths,
      connections: []  // Simplified as we removed context from XML
    };
  } catch (error) {
    console.error('Error parsing XML response:', error);
    throw new Error('Failed to parse Claude response');
  }
} 