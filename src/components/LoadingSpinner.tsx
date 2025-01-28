import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

export function LoadingSpinner({ size = 'medium', message = 'Exploring topic...' }: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`${sizeClasses[size]} animate-spin relative`}>
        <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 border-blue-200"></div>
      </div>
      {message && (
        <div className="mt-4 text-gray-600 text-sm font-medium">
          {message}
        </div>
      )}
    </div>
  );
} 