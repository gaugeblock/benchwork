// React hook for /api/v1/events SSE & /api/v1/ws live stream updates

import { useEffect, useState, useRef, useCallback } from 'react';
import type { LiveEvent } from '../types';

export function useLiveStream(onEvent?: (event: LiveEvent) => void) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<LiveEvent | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    // Attempt SSE connection first
    const eventSource = new EventSource('/api/v1/events');

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (e) => {
      try {
        const parsed: LiveEvent = JSON.parse(e.data);
        setLastEvent(parsed);
        if (onEventRef.current) {
          onEventRef.current(parsed);
        }
      } catch (err) {
        console.error('Failed parsing live event:', err);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
      // Retry in 5s
      setTimeout(connect, 5000);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return { connected, lastEvent };
}
