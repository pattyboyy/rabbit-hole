export interface Topic {
  id: string;
  title: string;
  summary: string;
  subtopics: SubTopic[];
  connections: Connection[];
  parentId?: string;
  depth: number;
}

export interface SubTopic {
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
  exploreDeeper: Array<{
    title: string;
    description: string;
    concepts: string;
    relevantTopics: string;
    researchAreas: string;
  }>;
}

export interface Connection {
  id: string;
  title: string;
  description: string;
}

export interface ExplorationNode {
  id: string;
  title: string;
  children: ExplorationNode[];
  depth: number;
} 