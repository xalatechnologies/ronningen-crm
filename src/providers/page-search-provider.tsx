"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type PageSearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
};

const PageSearchContext = createContext<PageSearchContextValue | null>(null);

export function PageSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQueryState] = useState("");
  const setQuery = useCallback((value: string) => {
    setQueryState(value);
  }, []);
  const value = useMemo(() => ({ query, setQuery }), [query, setQuery]);
  return (
    <PageSearchContext.Provider value={value}>{children}</PageSearchContext.Provider>
  );
}

export function usePageSearch(): PageSearchContextValue {
  const ctx = useContext(PageSearchContext);
  if (!ctx) {
    return { query: "", setQuery: () => undefined };
  }
  return ctx;
}
