// Member management context
import React, { createContext, useContext, useReducer } from 'react';

// Initial state
const initialState = {
  members: [],
  currentMember: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  }
};

// Action types
const actionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_MEMBERS: 'SET_MEMBERS',
  ADD_MEMBER: 'ADD_MEMBER',
  UPDATE_MEMBER: 'UPDATE_MEMBER',
  DELETE_MEMBER: 'DELETE_MEMBER',
  SET_CURRENT_MEMBER: 'SET_CURRENT_MEMBER',
  SET_PAGINATION: 'SET_PAGINATION',
  CLEAR_MEMBERS: 'CLEAR_MEMBERS'
};

// Reducer
const memberReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    case actionTypes.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    case actionTypes.CLEAR_ERROR:
      return { ...state, error: null };
    case actionTypes.SET_MEMBERS:
      return { ...state, members: action.payload, loading: false };
    case actionTypes.ADD_MEMBER:
      return { 
        ...state, 
        members: [...state.members, action.payload],
        loading: false 
      };
    case actionTypes.UPDATE_MEMBER:
      return {
        ...state,
        members: state.members.map(member => 
          member.memberId === action.payload.memberId ? action.payload : member
        ),
        currentMember: state.currentMember?.memberId === action.payload.memberId 
          ? action.payload 
          : state.currentMember,
        loading: false
      };
    case actionTypes.DELETE_MEMBER:
      return {
        ...state,
        members: state.members.filter(member => member.memberId !== action.payload),
        currentMember: state.currentMember?.memberId === action.payload 
          ? null 
          : state.currentMember,
        loading: false
      };
    case actionTypes.SET_CURRENT_MEMBER:
      return { ...state, currentMember: action.payload };
    case actionTypes.SET_PAGINATION:
      return { ...state, pagination: action.payload };
    case actionTypes.CLEAR_MEMBERS:
      return { ...state, members: [], currentMember: null };
    default:
      return state;
  }
};

// Create context
const MemberContext = createContext();

// Provider component
export const MemberProvider = ({ children }) => {
  const [state, dispatch] = useReducer(memberReducer, initialState);

  const actions = {
    setLoading: (loading) => dispatch({ type: actionTypes.SET_LOADING, payload: loading }),
    setError: (error) => dispatch({ type: actionTypes.SET_ERROR, payload: error }),
    clearError: () => dispatch({ type: actionTypes.CLEAR_ERROR }),
    setMembers: (members) => dispatch({ type: actionTypes.SET_MEMBERS, payload: members }),
    addMember: (member) => dispatch({ type: actionTypes.ADD_MEMBER, payload: member }),
    updateMember: (member) => dispatch({ type: actionTypes.UPDATE_MEMBER, payload: member }),
    deleteMember: (memberId) => dispatch({ type: actionTypes.DELETE_MEMBER, payload: memberId }),
    setCurrentMember: (member) => dispatch({ type: actionTypes.SET_CURRENT_MEMBER, payload: member }),
    setPagination: (pagination) => dispatch({ type: actionTypes.SET_PAGINATION, payload: pagination }),
    clearMembers: () => dispatch({ type: actionTypes.CLEAR_MEMBERS })
  };

  return (
    <MemberContext.Provider value={{ state, actions }}>
      {children}
    </MemberContext.Provider>
  );
};

// Custom hook to use the context
export const useMember = () => {
  const context = useContext(MemberContext);
  if (!context) {
    throw new Error('useMember must be used within a MemberProvider');
  }
  return context;
};

export default MemberContext; 