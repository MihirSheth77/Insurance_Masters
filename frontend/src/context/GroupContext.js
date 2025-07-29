// Current group context
import React, { createContext, useContext, useReducer } from 'react';

// Initial state
const initialState = {
  currentGroup: null,
  groups: [],
  loading: false,
  error: null
};

// Action types
const actionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_CURRENT_GROUP: 'SET_CURRENT_GROUP',
  SET_GROUPS: 'SET_GROUPS',
  ADD_GROUP: 'ADD_GROUP',
  UPDATE_GROUP: 'UPDATE_GROUP',
  CLEAR_CURRENT_GROUP: 'CLEAR_CURRENT_GROUP'
};

// Reducer
const groupReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    case actionTypes.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    case actionTypes.CLEAR_ERROR:
      return { ...state, error: null };
    case actionTypes.SET_CURRENT_GROUP:
      return { ...state, currentGroup: action.payload, loading: false };
    case actionTypes.SET_GROUPS:
      return { ...state, groups: action.payload, loading: false };
    case actionTypes.ADD_GROUP:
      return { 
        ...state, 
        groups: [...state.groups, action.payload],
        loading: false 
      };
    case actionTypes.UPDATE_GROUP:
      return {
        ...state,
        groups: state.groups.map(group => 
          group.groupId === action.payload.groupId ? action.payload : group
        ),
        currentGroup: state.currentGroup?.groupId === action.payload.groupId 
          ? action.payload 
          : state.currentGroup,
        loading: false
      };
    case actionTypes.CLEAR_CURRENT_GROUP:
      return { ...state, currentGroup: null };
    default:
      return state;
  }
};

// Create context
const GroupContext = createContext();

// Provider component
export const GroupProvider = ({ children }) => {
  const [state, dispatch] = useReducer(groupReducer, initialState);

  const actions = {
    setLoading: (loading) => dispatch({ type: actionTypes.SET_LOADING, payload: loading }),
    setError: (error) => dispatch({ type: actionTypes.SET_ERROR, payload: error }),
    clearError: () => dispatch({ type: actionTypes.CLEAR_ERROR }),
    setCurrentGroup: (group) => dispatch({ type: actionTypes.SET_CURRENT_GROUP, payload: group }),
    setGroups: (groups) => dispatch({ type: actionTypes.SET_GROUPS, payload: groups }),
    addGroup: (group) => dispatch({ type: actionTypes.ADD_GROUP, payload: group }),
    updateGroup: (group) => dispatch({ type: actionTypes.UPDATE_GROUP, payload: group }),
    clearCurrentGroup: () => dispatch({ type: actionTypes.CLEAR_CURRENT_GROUP })
  };

  return (
    <GroupContext.Provider value={{ state, actions }}>
      {children}
    </GroupContext.Provider>
  );
};

// Custom hook to use the context
export const useGroup = () => {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
};

export default GroupContext; 