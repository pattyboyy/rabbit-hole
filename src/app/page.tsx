'use client';

import React, { useState } from 'react';
import { Topic } from '@/types';
import { useExploration } from '@/context/ExplorationContext';

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentTopic, setCurrentTopic, addToExploration } = useExploration();

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/explore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          topic: searchTerm.trim(),
          depth: 0
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch topic');
      }
      
      setCurrentTopic(data);
      addToExploration('root', data);
    } catch (error) {
      console.error('Error fetching topic:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch topic');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubtopicClick = async (subtopic: { id: string; title: string }) => {
    if (!currentTopic) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/explore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: subtopic.title,
          parentId: currentTopic.id,
          depth: currentTopic.depth + 1
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch subtopic');
      }

      setCurrentTopic(data);
      addToExploration(currentTopic.id, data);
    } catch (error) {
      console.error('Error fetching subtopic:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch subtopic');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplorePathClick = async (path: { title: string; description: string }) => {
    if (!currentTopic) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/explore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: path.title,
          parentId: currentTopic.id,
          depth: currentTopic.depth + 1,
          context: path.description // Pass the path description as context
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch path');
      }

      setCurrentTopic(data);
      addToExploration(currentTopic.id, data);
    } catch (error) {
      console.error('Error fetching path:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch path');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter a topic to explore..."
          className="flex-1 p-2 border rounded"
          disabled={isLoading}
        />
        <button 
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading || !searchTerm.trim()}
        >
          {isLoading ? 'Exploring...' : 'Explore'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600">
          {error}
        </div>
      )}

      {isLoading && !currentTopic && (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Exploring your topic...
        </div>
      )}

      {!isLoading && !error && currentTopic ? (
        <div className="flex-1 overflow-y-auto">
          <h1 className="text-2xl font-bold mb-4">{currentTopic.title}</h1>
          <p className="mb-6">{currentTopic.summary}</p>
          
          <h2 className="text-xl font-semibold mb-3">Explore Deeper</h2>
          <div className="grid grid-cols-1 gap-6">
            {currentTopic.subtopics.map((subtopic) => (
              <div key={subtopic.id} className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">{subtopic.title}</h3>
                <p className="text-gray-600 mb-4">{subtopic.description}</p>
                
                {subtopic.keyTerms && subtopic.keyTerms.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Key Terms</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {subtopic.keyTerms.map((term, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded">
                          <div className="font-medium">{term.name}</div>
                          <div className="text-sm text-gray-600">{term.definition}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {subtopic.examples && subtopic.examples.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Examples</h4>
                    <div className="space-y-3">
                      {subtopic.examples.map((example, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded">
                          <div className="font-medium">{example.title}</div>
                          <div className="text-sm text-gray-600">{example.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {subtopic.exploreDeeper && subtopic.exploreDeeper.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Explore Deeper Paths</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {subtopic.exploreDeeper.map((path, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleExplorePathClick(path)}
                          disabled={isLoading}
                          className="text-left bg-gray-50 p-4 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="font-medium mb-1">{path.title}</div>
                          <p className="text-sm text-gray-600 mb-2">{path.description}</p>
                          <div className="text-sm">
                            <div className="text-blue-600 mb-1">
                              <span className="font-medium">Key Concepts:</span> {path.concepts}
                            </div>
                            <div className="text-green-600 mb-1">
                              <span className="font-medium">Related Topics:</span> {path.relevantTopics}
                            </div>
                            <div className="text-purple-600">
                              <span className="font-medium">Research Areas:</span> {path.researchAreas}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  className="mt-4 w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleSubtopicClick(subtopic)}
                  disabled={isLoading}
                >
                  Explore {subtopic.title}
                </button>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-semibold mt-6 mb-3">Interdisciplinary Connections</h2>
          <div className="space-y-4">
            {currentTopic.connections.map((connection) => (
              <div key={connection.id} className="p-4 border rounded">
                <h3 className="font-semibold">{connection.title}</h3>
                <p>{connection.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : !isLoading && !error ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Enter a topic above to begin your exploration
        </div>
      ) : null}
    </div>
  );
} 