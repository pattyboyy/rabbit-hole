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

// Update the XML pattern to be more lenient
const XML_PATTERN = /<\?xml[^>]*\?>[\s\S]*<exploration>[\s\S]*?<\/exploration>/;
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

    // Create a unique cache key that includes the path history
    const pathKey = previousPath.map(p => p.title).join('|');
    const cacheKey = `${topic}-${parentContext}-${pathKey}`;
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
    
    // Enhanced path context with more detail and structure
    const pathContext = previousPath.map((p: PathHistory, i: number) => 
      `${i + 1}. ${p.title}
         Description: ${p.description}
         Depth: Level ${i + 1}
         Relationship: ${i > 0 ? `Subtopic of ${previousPath[i-1].title}` : 'Root topic'}`
    ).join('\n\n');

    const rootTopic = previousPath[0]?.title || topic;
    const currentDepth = previousPath.length;
    
    // Enhanced context string with more structured information
    const contextString = parentContext ? 
      `EXPLORATION CONTEXT:
Root Topic: ${rootTopic}
Current Topic: "${topic}"
Exploration Depth: Level ${currentDepth + 1}
Current Branch: ${previousPath.map(p => p.title).join(' → ')}

DETAILED PATH:
${pathContext}

Current Focus: ${parentContext}

TOPIC DEFINITION:
"${topic}" is being explored as a ${currentDepth > 0 ? `level ${currentDepth + 1} concept` : 'root concept'} within ${rootTopic}.
${currentDepth > 0 ? `Direct parent: ${previousPath[previousPath.length - 1].title}` : ''}

IMPORTANT CONTEXT RULES:
1. You have sufficient context to provide a response about "${topic}" within ${rootTopic}
2. Every response MUST be directly related to ${rootTopic}
3. All examples must be from ${rootTopic} lore/universe
4. All exploration paths must maintain direct relevance to ${rootTopic}
5. Do not provide general or real-world examples unless explicitly comparing them to ${rootTopic}
6. Maintain the themes, terminology, and concepts specific to ${rootTopic}
7. Do not question or express uncertainty about the context - use the context provided
8. If a term appears in the exploration path, it is part of ${rootTopic} and should be explained within that context
9. Consider the full path history when providing examples and connections
10. Maintain consistency with all parent topics in the exploration chain

Your response should read as if it's a dedicated entry in the ${rootTopic} encyclopedia or sourcebook, with clear connections to its parent topics.${sensitivityContext}` 
      : sensitivityContext;

    // Add timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const systemPrompt = `You are an expert knowledge exploration assistant specializing in maintaining deep contextual relevance throughout topic chains. 
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

XML Format Requirements:
- <summary>: A section containing:
  - <text>: A concise 2-3 sentence overview of the topic
  - <lists>: (Optional) One or more <list> elements containing key points
    - Each <list> should have multiple <item> elements with <text> and optional <description>
- <detailedSummary>: A section containing:
  - <text>: A comprehensive explanation (3-5 paragraphs)
  - <lists>: (Optional) One or more detailed <list> elements
    - Each <list> should have multiple <item> elements with <text> and optional <description>
- <examples>: A section containing 2-4 notable examples:
  - <example>: Each example should include:
    - <title>: A descriptive title
    - <description>: Detailed explanation of the example
    - <significance>: Why this example is important or notable
    - <context>: Historical or situational context
    - <impact>: Long-term effects or influence
- <explorePaths>: 3-5 detailed exploration paths:
  - <path>: Each path should include:
    - <title>: Clear, specific topic title
    - <description>: Detailed explanation of this exploration direction
    - <concepts>: Key concepts to be explored
    - <relevantTopics>: Related topics worth investigating
    - <researchAreas>: Specific areas for deeper study
    - <keyQuestions>: Important questions to consider
    - <connections>: How this path connects to the main topic

Both summaries must maintain strict relevance to the root topic's universe.
Use lists to break down complex concepts, key components, or important aspects.
Each list item should be a clickable element that could lead to further exploration.
Examples should be highly specific and illustrative of key concepts.
Exploration paths should offer meaningful directions for deeper understanding.`;

    try {
      console.log('Making API request to Claude...', env.CLAUDE_API_URL);
      const response = await fetch(env.CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': env.CLAUDE_API_KEY,
          'accept': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          temperature: 0.7,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: `Explore "${topic}". ${contextString}\n\nFormat response in XML:\n<exploration>\n<summary>\n  <text>Brief overview</text>\n  <lists>\n    <list>\n      <item><text>Key point</text><description>Optional description</description></item>\n    </list>\n  </lists>\n</summary>\n<detailedSummary>\n  <text>Comprehensive explanation</text>\n  <lists>\n    <list>\n      <item><text>Detailed point</text><description>Optional description</description></item>\n    </list>\n  </lists>\n</detailedSummary>\n<examples>\n  <example>\n    <title>Notable example title</title>\n    <description>Detailed description</description>\n    <significance>Why this matters</significance>\n    <context>Historical or situational context</context>\n    <impact>Long-term effects or influence</impact>\n  </example>\n</examples>\n<explorePaths>\n  <path>\n    <title>Exploration path title</title>\n    <description>Detailed description</description>\n    <concepts>Key concepts to explore</concepts>\n    <relevantTopics>Related topics</relevantTopics>\n    <researchAreas>Areas for deeper study</researchAreas>\n    <keyQuestions>Important questions to consider</keyQuestions>\n    <connections>How this connects to main topic</connections>\n  </path>\n</explorePaths>\n</exploration>`
          }]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('Received response from Claude:', response.status, response.statusText);

      // Update progress: Processing response
      onProgress?.(loadingMessages.processing, 60);

      const responseText = await response.text();
      console.log('Raw response:', responseText.substring(0, 200) + '...');
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} - ${response.statusText} - ${responseText}`);
      }

      // Update progress: Analyzing
      onProgress?.(loadingMessages.analyzing, 80);

      // Parse the response directly
      const result = await parseClaudeResponse(responseText);
      responseCache.set(cacheKey, result);

      // Update progress: Complete
      onProgress?.(loadingMessages.complete, 100);
      
      return result;

    } catch (parseError: unknown) {
      console.error('Error processing response:', parseError);
      throw parseError;
    }

  } catch (error) {
    // Update progress: Error
    onProgress?.(loadingMessages.error, 100);
    console.error('Error in generateTopicExploration:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function parseClaudeResponse(jsonResponse: string) {
  try {
    // Parse the JSON response first
    const data: ClaudeResponse = JSON.parse(jsonResponse);
    const xmlContent = data.content?.[0]?.text;
    
    if (!xmlContent) {
      console.error('No XML content found in response');
      throw new Error('Invalid response from API: No content received');
    }

    // Clean the XML content first - before any parsing
    const cleanedXml = xmlContent
      .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '') // Remove control characters
      .trim();

    // Parse with more lenient options
    const parseOptions = {
      explicitArray: true,
      mergeAttrs: true,
      normalize: true,
      normalizeTags: true,
      tagNameProcessors: [(name: string): string => name.toLowerCase()],
      valueProcessors: [(value: string): string => value.trim()],
      strict: false,
      async: true
    };

    try {
      // Try parsing the full content first
      const result = await parseStringPromise(cleanedXml, parseOptions);

      // Log the parsed result for debugging
      console.log('Parsed result structure:', JSON.stringify(result, null, 2));

      if (result?.exploration?.[0]) {
        console.log('Successfully parsed full XML content');
        return processExplorationResult(result.exploration[0]);
      } else if (result?.exploration) {
        // Handle case where exploration might not be in an array
        console.log('Found exploration element without array');
        return processExplorationResult(result.exploration);
      }
    } catch (fullParseError) {
      console.log('Failed to parse full XML:', fullParseError);
      
      // Try to extract just the exploration element
      const xmlMatch = XML_PATTERN.exec(cleanedXml);
      if (!xmlMatch) {
        console.error('Failed to match XML pattern in content');
        throw new Error('No valid XML found in response');
      }

      // Parse the extracted XML
      const extractedXml = xmlMatch[0]
        .replace(/<\?xml[^>]*\?>\s*/g, '')  // Remove XML declaration
        .trim();

      console.log('Attempting to parse extracted XML:', extractedXml.substring(0, 200) + '...');

      const result = await parseStringPromise(extractedXml, parseOptions);

      if (result?.exploration) {
        const exploration = Array.isArray(result.exploration) 
          ? result.exploration[0] 
          : result.exploration;
        
        if (!exploration) {
          throw new Error('Invalid XML structure: exploration element is empty');
        }

        return processExplorationResult(exploration);
      }
    }

    throw new Error('Invalid XML structure: missing exploration element');
  } catch (error) {
    console.error('Error parsing Claude response:', error);
    console.error('Original response:', jsonResponse);
    throw new Error(`Failed to parse Claude response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Separate function to process the exploration result
function processExplorationResult(exploration: any) {
  try {
    // Ensure exploration is an object
    if (!exploration || typeof exploration !== 'object') {
      throw new Error('Invalid exploration data structure');
    }

    // Parse summary content with better error handling
    const parseSummaryContent = (summaryElement: any) => {
      try {
        if (!summaryElement) {
          return { text: '', lists: [] };
        }

        // Handle both array and non-array cases
        const text = Array.isArray(summaryElement.text) 
          ? summaryElement.text[0] 
          : summaryElement.text || '';

        const lists = summaryElement.lists?.[0]?.list?.map((list: any) => 
          (Array.isArray(list.item) ? list.item : [list.item]).map((item: any) => ({
            text: Array.isArray(item.text) ? item.text[0] : item.text || '',
            description: Array.isArray(item.description) ? item.description[0] : item.description
          }))
        ) || [];
        
        return { text, lists };
      } catch (error) {
        console.error('Error parsing summary content:', error);
        return { text: '', lists: [] };
      }
    };

    // Get summary and detailed summary, with fallbacks and error handling
    const summary = parseSummaryContent(
      Array.isArray(exploration.summary) ? exploration.summary[0] : exploration.summary
    );
    const detailedSummary = parseSummaryContent(
      Array.isArray(exploration.detailedsummary) 
        ? exploration.detailedsummary[0] 
        : exploration.detailedsummary || exploration.summary
    );

    // Parse examples with enhanced fields
    const examples = (Array.isArray(exploration.examples?.[0]?.example) 
      ? exploration.examples[0].example 
      : [exploration.examples?.[0]?.example]).map((e: any) => ({
        title: Array.isArray(e?.title) ? e.title[0] : e?.title || '',
        description: Array.isArray(e?.description) ? e.description[0] : e?.description || '',
        significance: Array.isArray(e?.significance) ? e.significance[0] : e?.significance || '',
        context: Array.isArray(e?.context) ? e.context[0] : e?.context || '',
        impact: Array.isArray(e?.impact) ? e.impact[0] : e?.impact || ''
    }));

    // Parse paths with enhanced fields
    const paths = (Array.isArray(exploration.explorepaths?.[0]?.path)
      ? exploration.explorepaths[0].path
      : [exploration.explorepaths?.[0]?.path]).map((p: any) => ({
        title: Array.isArray(p?.title) ? p.title[0] : p?.title || '',
        description: Array.isArray(p?.description) ? p.description[0] : p?.description || '',
        concepts: Array.isArray(p?.concepts) ? p.concepts[0] : p?.concepts || '',
        relevantTopics: Array.isArray(p?.relevanttopics) ? p.relevanttopics[0] : p?.relevanttopics || '',
        researchAreas: Array.isArray(p?.researchareas) ? p.researchareas[0] : p?.researchareas || '',
        keyQuestions: Array.isArray(p?.keyquestions) ? p.keyquestions[0] : p?.keyquestions || '',
        connections: Array.isArray(p?.connections) ? p.connections[0] : p?.connections || ''
    }));

    // Validate the parsed result
    if (!summary.text && !detailedSummary.text) {
      console.error('Missing required content in parsed result:', { summary, detailedSummary });
      throw new Error('Invalid content: missing required summary text');
    }

    return {
      summary,
      detailedSummary,
      examples,
      explorePaths: paths,
      connections: []
    };
  } catch (error) {
    console.error('Error processing exploration result:', error);
    throw error;
  }
} 