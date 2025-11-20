/**
 * Hook to measure the actual rendered size of a journey node container
 * Uses ResizeObserver to automatically track size changes
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useUpdateNodeInternals, useStore } from '@xyflow/react';

interface Size {
  width: number;
  height: number;
}

/**
 * Hook to measure journey node size from actual DOM rendering
 * Reports size changes to React Flow via updateNodeInternals
 */
export function useJourneySizeMeasurement(nodeId: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ width: 400, height: 300 });
  const updateNodeInternals = useUpdateNodeInternals();
  // Read current zoom from React Flow store (transform = [x, y, zoom])
  const zoom = useStore((s) => (Array.isArray(s.transform) ? s.transform[2] : 1)) || 1;

  const measureSize = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    // Convert from screen pixels to flow coordinate space by dividing by zoom
    const scale = Math.max(zoom, 0.01);
    const newSize = {
      width: Math.ceil(rect.width / scale),
      height: Math.ceil(rect.height / scale),
    };

    // Only update if size actually changed (avoid infinite loops)
    setSize((prev) => {
      if (
        Math.abs(prev.width - newSize.width) > 1 ||
        Math.abs(prev.height - newSize.height) > 1
      ) {
        return newSize;
      }
      return prev;
    });
  }, [zoom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial measurement after a brief delay to ensure content is rendered
    const initialTimer = setTimeout(() => {
      measureSize();
    }, 50);

    // Use ResizeObserver for automatic size tracking
    const resizeObserver = new ResizeObserver(() => {
      // Debounce rapid changes
      requestAnimationFrame(() => {
        measureSize();
      });
    });

    resizeObserver.observe(container);

    return () => {
      clearTimeout(initialTimer);
      resizeObserver.disconnect();
    };
  }, [measureSize]);

  // Update React Flow node internals when size changes
  useEffect(() => {
    if (size.width > 0 && size.height > 0) {
      // Use requestAnimationFrame to batch updates
      requestAnimationFrame(() => {
        updateNodeInternals(nodeId);
      });
    }
  }, [size.width, size.height, nodeId, updateNodeInternals]);

  return {
    containerRef,
    size,
  };
}

