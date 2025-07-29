// Quote state context
import React, { createContext, useContext, useReducer } from 'react';

// Initial state
const initialState = {
  quotes: [],
  currentQuote: null,
  quoteResults: null,
  loading: false,
  error: null,
  filters: {
    metalLevels: [],
    carriers: [],
    hsaEligible: null,
    sortBy: 'premium'
  }
};

// Action types
const actionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_QUOTES: 'SET_QUOTES',
  ADD_QUOTE: 'ADD_QUOTE',
  SET_CURRENT_QUOTE: 'SET_CURRENT_QUOTE',
  SET_QUOTE_RESULTS: 'SET_QUOTE_RESULTS',
  UPDATE_FILTERS: 'UPDATE_FILTERS',
  CLEAR_FILTERS: 'CLEAR_FILTERS',
  CLEAR_QUOTES: 'CLEAR_QUOTES'
};

// Reducer
const quoteReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    case actionTypes.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    case actionTypes.CLEAR_ERROR:
      return { ...state, error: null };
    case actionTypes.SET_QUOTES:
      return { ...state, quotes: action.payload, loading: false };
    case actionTypes.ADD_QUOTE:
      return { 
        ...state, 
        quotes: [...state.quotes, action.payload],
        loading: false 
      };
    case actionTypes.SET_CURRENT_QUOTE:
      return { ...state, currentQuote: action.payload };
    case actionTypes.SET_QUOTE_RESULTS:
      return { ...state, quoteResults: action.payload, loading: false };
    case actionTypes.UPDATE_FILTERS:
      return { 
        ...state, 
        filters: { ...state.filters, ...action.payload }
      };
    case actionTypes.CLEAR_FILTERS:
      return { 
        ...state, 
        filters: {
          metalLevels: [],
          carriers: [],
          hsaEligible: null,
          sortBy: 'premium'
        }
      };
    case actionTypes.CLEAR_QUOTES:
      return { 
        ...state, 
        quotes: [], 
        currentQuote: null, 
        quoteResults: null 
      };
    default:
      return state;
  }
};

// Create context
const QuoteContext = createContext();

// Provider component
export const QuoteProvider = ({ children }) => {
  const [state, dispatch] = useReducer(quoteReducer, initialState);

  const actions = {
    setLoading: (loading) => dispatch({ type: actionTypes.SET_LOADING, payload: loading }),
    setError: (error) => dispatch({ type: actionTypes.SET_ERROR, payload: error }),
    clearError: () => dispatch({ type: actionTypes.CLEAR_ERROR }),
    setQuotes: (quotes) => dispatch({ type: actionTypes.SET_QUOTES, payload: quotes }),
    addQuote: (quote) => dispatch({ type: actionTypes.ADD_QUOTE, payload: quote }),
    setCurrentQuote: (quote) => dispatch({ type: actionTypes.SET_CURRENT_QUOTE, payload: quote }),
    setQuoteResults: (results) => dispatch({ type: actionTypes.SET_QUOTE_RESULTS, payload: results }),
    updateFilters: (filters) => dispatch({ type: actionTypes.UPDATE_FILTERS, payload: filters }),
    clearFilters: () => dispatch({ type: actionTypes.CLEAR_FILTERS }),
    clearQuotes: () => dispatch({ type: actionTypes.CLEAR_QUOTES })
  };

  return (
    <QuoteContext.Provider value={{ state, actions }}>
      {children}
    </QuoteContext.Provider>
  );
};

// Custom hook to use the context
export const useQuote = () => {
  const context = useContext(QuoteContext);
  if (!context) {
    throw new Error('useQuote must be used within a QuoteProvider');
  }
  return context;
};

export default QuoteContext; 