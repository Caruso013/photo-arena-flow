import React, { createContext, useContext, useState } from 'react';

interface SearchContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);
const SEARCH_STORAGE_KEY = 'sta-search-term';

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchTerm, setSearchTermState] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(SEARCH_STORAGE_KEY) || '';
  });

  const setSearchTerm = (term: string) => {
    setSearchTermState(term);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SEARCH_STORAGE_KEY, term);
    }
  };

  return (
    <SearchContext.Provider value={{ searchTerm, setSearchTerm }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
};
