'use client';

import React, { useState, useEffect } from 'react';
import { Topic, ExplorePath, PathHistory, Example } from '@/types';
import { useExploration } from '@/context/ExplorationContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { LoadingState, defaultLoadingState } from '@/lib/loadingStates';

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(defaultLoadingState);
  const [error, setError] = useState<string | null>(null);
  const { addToExploration } = useExploration();

  // Reset loading state when component unmounts
  useEffect(() => {
    return () => {
      setLoadingState(defaultLoadingState);
    };
  }, []);

  // Shared function to handle API calls
  const handleExplorationRequest = async (
    topic: string,
    parentId?: string,
    depth: number = 0,
    context?: string,
    previousPath: PathHistory[] = []
  ) => {
    try {
      console.log('Making API request for:', topic);
      const response = await fetch('http://localhost:3001/api/explore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          topic: topic.trim(),
          parentId,
          depth,
          context,
          pathHistory: previousPath
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let hasReceivedData = false;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream complete');
          // If we received data but no completion event, force completion
          if (hasReceivedData) {
            setLoadingState({
              isLoading: false,
              message: 'Exploration complete!',
              progress: 100
            });
          }
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log('Received chunk:', chunk);
        
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(5));
              console.log('Parsed event:', data);

              if (data.type === 'progress') {
                console.log('Updating progress:', data.progress);
                setLoadingState({
                  isLoading: data.progress < 100,
                  message: data.message,
                  progress: data.progress
                });
              } else if (data.type === 'data') {
                console.log('Received data:', data.result);
                hasReceivedData = true;
                const topicData = {
                  ...data.result,
                  id: Math.random().toString(36).substring(7),
                  title: topic.trim(),
                  depth,
                  pathHistory: previousPath,
                  explorePaths: data.result.explorePaths.map((path: any) => ({
                    ...path,
                    relevantTopics: path.relevantTopics || 'None specified',
                    researchAreas: path.researchAreas || 'None specified'
                  }))
                };
                setCurrentTopic(topicData);
                addToExploration(parentId || 'root', topicData);
              } else if (data.type === 'error') {
                console.error('Received error event:', data.message);
                throw new Error(data.message);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e, 'Line:', line);
              throw e;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in exploration:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      setLoadingState({
        isLoading: false,
        message: 'Error occurred',
        progress: 0
      });
    }
  };

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    // Reset states
    setCurrentTopic(null);
    setError(null);
    setLoadingState({ isLoading: true, message: 'Starting exploration...', progress: 0 });

    await handleExplorationRequest(searchTerm, undefined, 0, undefined, []);
  };

  const handleSubtopicClick = async (subtopic: { id: string; title: string }) => {
    if (!currentTopic) return;
    
    setError(null);
    setLoadingState({ isLoading: true, message: 'Starting exploration...', progress: 0 });

    await handleExplorationRequest(
      subtopic.title,
      currentTopic.id,
      currentTopic.depth + 1
    );
  };

  const handleExplorePathClick = async (path: ExplorePath) => {
    if (!currentTopic) return;
    
    setError(null);
    setLoadingState({ isLoading: true, message: 'Starting exploration...', progress: 0 });

    // Create a more specific context that includes the full path history
    const newPathHistory = [
      ...currentTopic.pathHistory,
      { title: currentTopic.title, description: path.description }
    ];
    
    const pathContext = newPathHistory
      .map((p, i) => `${i + 1}. ${p.title}`)
      .join(' > ');

    const explorationContext = `Exploration path: ${pathContext} > ${path.title}. Currently exploring "${path.title}" with focus on: ${path.description}. Please maintain relevance to the entire exploration chain.`;

    await handleExplorationRequest(
      path.title,
      currentTopic.id,
      currentTopic.depth + 1,
      explorationContext,
      newPathHistory
    );
  };

  const handleExampleClick = async (example: Example) => {
    if (!currentTopic) return;
    
    setError(null);
    setLoadingState({ isLoading: true, message: 'Starting exploration...', progress: 0 });

    const newPathHistory = [
      ...currentTopic.pathHistory,
      { title: currentTopic.title, description: example.description }
    ];
    
    const pathContext = newPathHistory
      .map((p, i) => `${i + 1}. ${p.title}`)
      .join(' > ');

    const explorationContext = `Exploration path: ${pathContext} > ${example.title}. Currently exploring this example with focus on: ${example.description}. Please maintain relevance to the entire exploration chain, especially the root topic "${newPathHistory[0].title}".`;

    await handleExplorationRequest(
      example.title,
      currentTopic.id,
      currentTopic.depth + 1,
      explorationContext,
      newPathHistory
    );
  };

  return (
    <div className="min-h-screen flex flex-col p-4 max-w-7xl mx-auto">
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter a topic to explore..."
          className="flex-1 p-2 border rounded shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          disabled={loadingState.isLoading}
        />
        <button 
          type="submit"
          className="px-6 py-2 bg-blue-500 text-white rounded shadow-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[120px]"
          disabled={loadingState.isLoading || !searchTerm.trim()}
        >
          {loadingState.isLoading ? <LoadingSpinner size="small" /> : 'Explore'}
        </button>
      </form>

      {loadingState.isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner size="large" message={loadingState.message} />
          <div className="w-full max-w-md mt-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${loadingState.progress}%` }}
              />
            </div>
            <div className="text-center text-sm text-gray-500 mt-2">
              {loadingState.progress}%
            </div>
          </div>
        </div>
      )}

      {error && !loadingState.isLoading && (
        <div className="p-4 my-6 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {currentTopic && !loadingState.isLoading && (
        <div className="flex-1 space-y-8">
          {currentTopic.pathHistory.length > 0 && (
            <nav className="flex items-center space-x-2 text-sm text-gray-500">
              {currentTopic.pathHistory.map((path, idx) => (
                <React.Fragment key={idx}>
                  <span className="hover:text-gray-700 cursor-pointer" title={path.description}>
                    {path.title}
                  </span>
                  <span className="text-gray-400">/</span>
                </React.Fragment>
              ))}
              <span className="font-medium text-gray-900">{currentTopic.title}</span>
            </nav>
          )}

          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h1 className="text-3xl font-bold text-gray-900">{currentTopic.title}</h1>
            <p className="text-lg text-gray-700 leading-relaxed">{currentTopic.summary}</p>
          </div>

          {currentTopic.examples.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Notable Examples</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentTopic.examples.map((example, idx) => (
                  <div 
                    key={`example-${idx}`}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden"
                  >
                    <div className="p-6 space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{example.title}</h3>
                        <p className="text-gray-600">{example.description}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Significance</h4>
                        <p className="mt-2 text-gray-600">{example.significance}</p>
                      </div>
                      <button
                        onClick={() => handleExampleClick(example)}
                        className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        disabled={loadingState.isLoading}
                      >
                        Explore This Example
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">Explore Deeper</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentTopic.explorePaths.map((path, idx) => (
                <div 
                  key={`${currentTopic.id}-${idx}`} 
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden"
                >
                  <div className="p-6 space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{path.title}</h3>
                      <p className="text-gray-600">{path.description}</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900">Key Concepts</h4>
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-gray-600 text-sm">
                          {path.concepts}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900">Relevant Topics</h4>
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-gray-600 text-sm">
                          {path.relevantTopics}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900">Research Areas</h4>
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-gray-600 text-sm">
                          {path.researchAreas}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleExplorePathClick(path)}
                      disabled={loadingState.isLoading}
                      className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Explore This Path
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!currentTopic && !loadingState.isLoading && !error && (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-lg">
          Enter a topic above to begin your exploration
        </div>
      )}
    </div>
  );
} 