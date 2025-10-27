import { useLoadingContext } from "@/contexts/LoadingContext";

export const useLoading = () => {
  const { setFetching, setSubmitting } = useLoadingContext();

  /**
   * Wrapper for async operations that require fetching loading state
   */
  const withFetchingLoading = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setFetching(true);
    try {
      const result = await fn();
      return result;
    } finally {
      setFetching(false);
    }
  };

  /**
   * Wrapper for async operations that require submitting loading state
   */
  const withSubmittingLoading = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setSubmitting(true);
    try {
      const result = await fn();
      return result;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    withFetchingLoading,
    withSubmittingLoading,
  };
};
