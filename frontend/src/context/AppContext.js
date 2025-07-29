// Global app state context
import React, { createContext, useContext, useReducer } from 'react';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  theme: 'light'
};

// Action types
const actionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_USER: 'SET_USER',
  LOGOUT: 'LOGOUT',
  SET_THEME: 'SET_THEME'
};

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    case actionTypes.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    case actionTypes.CLEAR_ERROR:
      return { ...state, error: null };
    case actionTypes.SET_USER:
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: !!action.payload,
        loading: false 
      };
    case actionTypes.LOGOUT:
      return { 
        ...state, 
        user: null, 
        isAuthenticated: false,
        loading: false 
      };
    case actionTypes.SET_THEME:
      return { ...state, theme: action.payload };
    default:
      return state;
  }
};

// Create context
const AppContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const actions = {
    setLoading: (loading) => dispatch({ type: actionTypes.SET_LOADING, payload: loading }),
    setError: (error) => dispatch({ type: actionTypes.SET_ERROR, payload: error }),
    clearError: () => dispatch({ type: actionTypes.CLEAR_ERROR }),
    setUser: (user) => dispatch({ type: actionTypes.SET_USER, payload: user }),
    logout: () => dispatch({ type: actionTypes.LOGOUT }),
    setTheme: (theme) => dispatch({ type: actionTypes.SET_THEME, payload: theme })
  };

  // Notification method using react-hot-toast
  const showNotification = ({ type, message, duration = 4000 }) => {
    switch (type) {
      case 'success':
        toast.success(message, { duration });
        break;
      case 'error':
        toast.error(message, { duration });
        break;
      case 'info':
        toast(message, { duration, icon: 'ℹ️' });
        break;
      case 'warning':
        toast(message, { duration, icon: '⚠️' });
        break;
      default:
        toast(message, { duration });
    }
  };

  return (
    <AppContext.Provider value={{ state, actions, showNotification }}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext; 