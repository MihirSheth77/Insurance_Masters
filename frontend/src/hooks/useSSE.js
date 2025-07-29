import { useState, useEffect, useRef, useCallback } from 'react';

const useSSE = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [error, setError] = useState(null);
  
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  
  const {
    maxReconnectAttempts = 5,
    reconnectInterval = 1000,
    onMessage = null,
    onError = null,
    onOpen = null
  } = options;

  const connect = useCallback(() => {
    try {
      // Clean up any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setConnectionStatus('connecting');
      setError(null);

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        if (onOpen) onOpen();
      };

      eventSource.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          
          if (parsedData.type === 'metrics') {
            setData(parsedData.data);
          }
          
          if (onMessage) onMessage(parsedData);
        } catch (err) {
          console.error('Error parsing SSE message:', err);
          setError(err);
        }
      };

      eventSource.onerror = (err) => {
        setConnectionStatus('disconnected');
        setError(err);
        
        if (onError) onError(err);

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const timeout = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current += 1;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, timeout);
        } else {
          setConnectionStatus('failed');
          setError(new Error('Max reconnection attempts reached'));
        }
      };

    } catch (err) {
      setConnectionStatus('failed');
      setError(err);
    }
  }, [url, maxReconnectAttempts, reconnectInterval, onMessage, onError, onOpen]);

  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  return {
    data,
    connectionStatus,
    error,
    reconnect
  };
};

export default useSSE;