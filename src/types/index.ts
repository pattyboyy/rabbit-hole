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

export interface ListItem {
  text: string;
  description?: string;
}

export interface TopicContent {
  text: string;
  lists?: ListItem[][];  // Array of lists, each list is an array of items
}

export interface Topic {
  id: string;
  title: string;
  summary: TopicContent;
  detailedSummary: TopicContent;
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