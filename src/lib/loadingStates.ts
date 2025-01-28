export type LoadingState = {
  isLoading: boolean;
  message: string;
  progress: number;
};

export const loadingMessages = {
  initial: 'Initiating exploration...',
  fetching: 'Gathering knowledge...',
  processing: 'Processing insights...',
  analyzing: 'Analyzing connections...',
  finalizing: 'Organizing results...',
  complete: 'Exploration complete!',
  error: 'Error occurred during exploration'
};

export const defaultLoadingState: LoadingState = {
  isLoading: false,
  message: '',
  progress: 0
}; 