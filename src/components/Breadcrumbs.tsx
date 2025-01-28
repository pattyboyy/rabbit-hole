'use client';

import React from 'react';
import { Topic } from '@/types';

interface BreadcrumbsProps {
  path: Topic[];
  onNavigate: (topic: Topic) => void;
}

export default function Breadcrumbs({ path, onNavigate }: BreadcrumbsProps) {
  return (
    <nav className="flex flex-col space-y-2">
      <h2 className="text-lg font-semibold mb-2">Exploration Path</h2>
      <div className="flex flex-col space-y-1">
        {path.map((topic, index) => (
          <div 
            key={topic.id}
            className="flex items-center space-x-2"
          >
            <div className="flex-shrink-0 w-6 text-gray-400">
              {index + 1}.
            </div>
            <button
              onClick={() => onNavigate(topic)}
              className="text-left hover:text-blue-500 truncate"
            >
              {topic.title}
            </button>
          </div>
        ))}
      </div>
    </nav>
  );
} 