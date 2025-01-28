'use client';

import React, { createContext, useContext, useState } from 'react';
import { Topic, ExplorationNode } from '@/types';

interface ExplorationContextType {
  currentTopic: Topic | null;
  explorationTree: ExplorationNode;
  setCurrentTopic: (topic: Topic | null) => void;
  addToExploration: (parentId: string, topic: Topic) => void;
}

const ExplorationContext = createContext<ExplorationContextType | undefined>(undefined);

export function ExplorationProvider({ children }: { children: React.ReactNode }) {
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [explorationTree, setExplorationTree] = useState<ExplorationNode>({
    id: 'root',
    title: 'Start Exploring',
    children: [],
    depth: 0
  });

  const addToExploration = (parentId: string, topic: Topic) => {
    const newNode: ExplorationNode = {
      id: topic.id,
      title: topic.title,
      children: [],
      depth: topic.depth
    };

    setExplorationTree((prevTree: ExplorationNode) => {
      const updateChildren = (node: ExplorationNode): ExplorationNode => {
        if (node.id === parentId) {
          return {
            ...node,
            children: [...node.children, newNode]
          };
        }
        return {
          ...node,
          children: node.children.map(updateChildren)
        };
      };
      return updateChildren(prevTree);
    });
  };

  return (
    <ExplorationContext.Provider 
      value={{ 
        currentTopic, 
        explorationTree, 
        setCurrentTopic, 
        addToExploration 
      }}
    >
      {children}
    </ExplorationContext.Provider>
  );
}

export function useExploration() {
  const context = useContext(ExplorationContext);
  if (context === undefined) {
    throw new Error('useExploration must be used within an ExplorationProvider');
  }
  return context;
} 