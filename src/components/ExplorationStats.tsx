'use client';

import React from 'react';
import { Topic } from '@/types';

interface ExplorationStatsProps {
  currentTopic: Topic | null;
  pathLength: number;
  startTime: Date;
}

export default function ExplorationStats({ 
  currentTopic, 
  pathLength, 
  startTime 
}: ExplorationStatsProps) {
  const [elapsedTime, setElapsedTime] = React.useState<string>('00:00');

  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - startTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsedTime(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Session Stats</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Depth Level:</span>
            <span className="font-medium">{pathLength}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Time Spent:</span>
            <span className="font-medium">{elapsedTime}</span>
          </div>
        </div>
      </div>

      {currentTopic && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Current Topic</h2>
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              <span className="font-medium">Depth:</span> {currentTopic.depth}
            </p>
            <p>
              <span className="font-medium">Subtopics:</span> {currentTopic.subtopics.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 