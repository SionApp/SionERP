import { createContext, useContext, useState, ReactNode } from "react";

interface LoadingContextType {
  isFetching: boolean;
  isSubmitting: boolean;
  setFetching: (loading: boolean) => void;
  setSubmitting: (loading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setFetching = (loading: boolean) => {
    setIsFetching(loading);
  };

  const setSubmitting = (loading: boolean) => {
    setIsSubmitting(loading);
  };

  return (
    <LoadingContext.Provider value={{ isFetching, isSubmitting, setFetching, setSubmitting }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoadingContext = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoadingContext must be used within a LoadingProvider");
  }
  return context;
};
