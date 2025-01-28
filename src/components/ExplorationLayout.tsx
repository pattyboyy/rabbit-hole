'use client';

import React from 'react';
import ExplorationTree from './ExplorationTree';
import Breadcrumbs from './Breadcrumbs';
import ExplorationStats from './ExplorationStats';
import { useExploration } from '@/context/ExplorationContext';

export default function ExplorationLayout({ children }: { children: React.ReactNode }) {
  const { explorationTree, currentTopic } = useExploration();

  return (
    <main className="flex h-screen">
      <aside className="w-1/4 border-r border-gray-200 p-4 overflow-hidden">
        <ExplorationTree data={explorationTree} />
      </aside>
      <section className="w-1/2 p-4">
        {children}
      </section>
      <aside className="w-1/4 border-l border-gray-200 p-4">
        <div className="space-y-8">
          <Breadcrumbs 
            path={currentTopic ? [currentTopic] : []} 
            onNavigate={() => {}} 
          />
          <ExplorationStats 
            currentTopic={currentTopic}
            pathLength={currentTopic ? 1 : 0}
            startTime={new Date()}
          />
        </div>
      </aside>
    </main>
  );
} 