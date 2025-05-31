import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { setError, setLoading } from '@/store/navigationSlice';

export const useErrorHandler = () => {
  const dispatch = useDispatch();

  const handleError = useCallback(
    (error: unknown, customMessage?: string) => {
      console.error('Error:', error);

      let errorMessage = customMessage || 'An unexpected error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      dispatch(setError(errorMessage));
      dispatch(setLoading(false));
    },
    [dispatch]
  );

  const withErrorHandling = useCallback(
    async <T>(operation: () => Promise<T>, customErrorMessage?: string): Promise<T | null> => {
      try {
        dispatch(setLoading(true));
        dispatch(setError(null));
        return await operation();
      } catch (error) {
        handleError(error, customErrorMessage);
        return null;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch, handleError]
  );

  return {
    handleError,
    withErrorHandling,
  };
};
