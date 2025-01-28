import { env } from '@/config/env';
import { parseStringPromise } from 'xml2js';

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

export async function generateTopicExploration(topic: string, parentContext: string = '') {
  try {
    // Log environment configuration
    console.log('Environment Check:', {
      apiKeyPresent: !!env.CLAUDE_API_KEY,
      apiKeyLength: env.CLAUDE_API_KEY?.length || 0,
    });

    console.log('Making request to Claude API for topic:', topic);
    const requestBody = {
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 5000,
      temperature: 0.9,
      system: "You are an expert knowledge exploration assistant. Your task is to help users explore topics in depth. Always respond in well-structured XML format. Focus on generating detailed subtopics with multiple explore deeper paths.",
      messages: [{
        role: 'user',
        content: `Generate a comprehensive exploration of the topic "${topic}". Include:

1. A thorough summary (4-5 paragraphs) that covers:
   - Core concepts and fundamental principles
   - Historical context and development
   - Current significance and applications
   - Key challenges and ongoing debates
   - Future implications and trends

2. 10-12 relevant subtopics with detailed descriptions that include:
   - Key concepts and terminology
   - Real-world examples and case studies
   - Common misconceptions
   - Latest developments or research
   - 5-6 explore deeper paths for each subtopic, including:
     * Related advanced concepts
     * Specialized areas of study
     * Current research directions
     * Emerging technologies or methodologies
     * Controversial aspects or debates
     * Historical developments and evolution

Format your response in this exact XML structure:
<exploration>
  <summary>Comprehensive summary addressing all required points</summary>
  <subtopics>
    <topic>
      <title>Subtopic title</title>
      <description>Detailed description including examples and case studies</description>
      <keyTerms>
        <term>
          <name>Technical term</name>
          <definition>Clear definition with examples</definition>
        </term>
      </keyTerms>
      <examples>
        <example>
          <title>Example title</title>
          <description>Detailed example description</description>
        </example>
      </examples>
      <exploreDeeper>
        <path>
          <title>Advanced Concepts Path</title>
          <description>Exploration of advanced theoretical frameworks and concepts</description>
          <concepts>Key advanced concepts to explore</concepts>
          <relevantTopics>Advanced theoretical areas</relevantTopics>
          <researchAreas>Theoretical research directions</researchAreas>
        </path>
        <path>
          <title>Research Directions Path</title>
          <description>Current and emerging research directions in the field</description>
          <concepts>Research methodologies and approaches</concepts>
          <relevantTopics>Current research topics</relevantTopics>
          <researchAreas>Active research areas and opportunities</researchAreas>
        </path>
        <path>
          <title>Technological Applications Path</title>
          <description>Practical applications and technological implementations</description>
          <concepts>Applied concepts and technologies</concepts>
          <relevantTopics>Implementation areas</relevantTopics>
          <researchAreas>Technology development directions</researchAreas>
        </path>
        <path>
          <title>Historical Development Path</title>
          <description>Evolution and historical significance of key developments</description>
          <concepts>Historical frameworks and paradigms</concepts>
          <relevantTopics>Historical context and evolution</relevantTopics>
          <researchAreas>Historical analysis methods</researchAreas>
        </path>
        <path>
          <title>Controversies and Debates Path</title>
          <description>Major debates and controversial aspects in the field</description>
          <concepts>Competing theories and viewpoints</concepts>
          <relevantTopics>Controversial areas and debates</relevantTopics>
          <researchAreas>Critical analysis approaches</researchAreas>
        </path>
        <path>
          <title>Future Directions Path</title>
          <description>Emerging trends and future possibilities</description>
          <concepts>Future scenarios and possibilities</concepts>
          <relevantTopics>Emerging trends and developments</relevantTopics>
          <researchAreas>Future-oriented research</researchAreas>
        </path>
      </exploreDeeper>
    </topic>
  </subtopics>
  <context>
    <historical>
      <evolution>Historical evolution and key developments</evolution>
      <keyEvents>
        <event>
          <date>Date or period</date>
          <description>Event description and significance</description>
        </event>
      </keyEvents>
    </historical>
    <current>
      <state>Current state of the field</state>
      <trends>Emerging trends and developments</trends>
      <challenges>Current challenges and obstacles</challenges>
    </current>
    <cultural>
      <perspectives>Different viewpoints and interpretations</perspectives>
      <impact>Societal and cultural implications</impact>
    </cultural>
  </context>
</exploration>

Important: 
- Ensure your response is valid XML and follows this exact structure
- MUST include all 6 explore deeper paths for each subtopic as shown in the example
- Each explore deeper path should focus on a different aspect (advanced concepts, research, technology, history, controversies, future)
- Provide specific, concrete examples rather than general statements
- Include recent developments and cutting-edge research
- Balance technical depth with accessibility
- Make sure explore deeper paths are substantive and lead to meaningful areas of further study
- Include comprehensive analysis in the summary and context sections`
      }]
    };

    console.log('Claude API Request:', {
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: requestBody
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': env.CLAUDE_API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Claude API Response Status:', response.status);
    console.log('Claude API Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorMessage = `Claude API call failed: ${response.statusText}`;
      try {
        const responseText = await response.text();
        console.error('Claude API Error Response:', responseText);
        try {
          const errorData = JSON.parse(responseText);
          console.error('Claude API Error Data:', errorData);
          errorMessage = errorData.error?.message || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response as JSON:', parseError);
        }
      } catch (e) {
        console.error('Failed to read error response:', e);
      }
      throw new Error(errorMessage);
    }

    // Read the response as text first
    const responseText = await response.text();
    console.log('Claude API Raw Response:', responseText);

    // Log the full response text for debugging
    console.log('Full API Response Text:', responseText);

    // Check if the response is JSON and log it
    try {
      const jsonResponse = JSON.parse(responseText);
      console.log('Parsed JSON Response:', jsonResponse);
    } catch (jsonParseError) {
      console.error('Response is not valid JSON:', jsonParseError);
    }

    // Then parse as JSON
    const data: ClaudeResponse = JSON.parse(responseText);
    
    if (!data.content?.[0]?.text) {
      console.error('Unexpected Claude API response format:', data);
      throw new Error('Invalid response format from Claude API');
    }

    const xmlContent = data.content[0].text;
    console.log('Claude API XML Response:', xmlContent);

    // Extract the XML content from the response
    const xmlMatch = xmlContent.match(/<exploration>[\s\S]*<\/exploration>/);
    if (!xmlMatch) {
      console.error('No XML found in response:', xmlContent);
      throw new Error('No XML found in Claude response');
    }

    const cleanXml = xmlMatch[0].trim();
    console.log('Cleaned XML:', cleanXml);

    return parseClaudeResponse(cleanXml);
  } catch (error) {
    console.error('Error in generateTopicExploration:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
      error
    });
    throw error;
  }
}

async function parseClaudeResponse(xmlContent: string) {
  try {
    console.log('Attempting to parse XML:', xmlContent);

    // Parse XML with explicit array handling for paths
    const result = await parseStringPromise(xmlContent, { 
      explicitArray: true,  // Changed to true to force arrays
      mergeAttrs: true 
    });

    console.log('Parsed XML Result:', result);

    if (!result.exploration || !result.exploration.summary || !result.exploration.subtopics) {
      throw new Error('Invalid XML structure: missing required elements');
    }

    const summary = result.exploration.summary[0];
    
    // Parse subtopics with enhanced structure
    const subtopics = result.exploration.subtopics[0]?.topic?.map((t: any) => {
      console.log('Processing subtopic:', t.title?.[0]);
      
      // Get all paths from the exploreDeeper section
      const paths = t.exploreDeeper?.[0]?.path || [];
      console.log(`Found ${paths.length} explore deeper paths for subtopic ${t.title?.[0]}`);
      
      return {
        title: t.title?.[0] || '',
        description: t.description?.[0] || '',
        keyTerms: t.keyTerms?.[0]?.term?.map((term: any) => ({
          name: term.name?.[0] || '',
          definition: term.definition?.[0] || ''
        })) || [],
        examples: t.examples?.[0]?.example?.map((ex: any) => ({
          title: ex.title?.[0] || '',
          description: ex.description?.[0] || ''
        })) || [],
        exploreDeeper: paths.map((p: any) => ({
          title: p.title?.[0] || '',
          description: p.description?.[0] || '',
          concepts: p.concepts?.[0] || '',
          relevantTopics: p.relevantTopics?.[0] || '',
          researchAreas: p.researchAreas?.[0] || ''
        }))
      };
    }) || [];

    // Parse connections
    const connections = result.exploration.connections?.[0]?.connection?.map((c: any) => ({
      title: c.title?.[0] || '',
      description: c.description?.[0] || ''
    })) || [];

    const parsedData = {
      summary,
      subtopics,
      connections
    };

    console.log('Successfully parsed response:', parsedData);
    return parsedData;
  } catch (error) {
    console.error('Error parsing XML response:', {
      error,
      xmlContent,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : 'No stack trace',
    });
    throw new Error('Failed to parse Claude response');
  }
} 