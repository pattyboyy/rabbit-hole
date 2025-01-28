export interface PathHistory {
  title: string;
  description: string;
}

export interface Example {
  title: string;
  description: string;
  significance: string;
}

export interface ExplorePath {
  title: string;
  description: string;
  concepts: string;
  relevantTopics: string;
  researchAreas: string;
}

export interface Topic {
  id: string;
  title: string;
  summary: string;
  detailedSummary: string;
  examples: Example[];
  explorePaths: ExplorePath[];
  connections: Connection[];
  parentId?: string;
  depth: number;
  pathHistory: PathHistory[];
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