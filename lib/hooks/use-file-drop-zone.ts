import { useCallback, useRef, useState } from "react";

type UseFileDropZoneOptions = {
  disabled?: boolean;
  onDrop: (files: FileList) => void;
};

export function useFileDropZone({ disabled = false, onDrop }: UseFileDropZoneOptions) {
  const dragCounterRef = useRef(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const resetDrag = useCallback(() => {
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
  }, []);

  const handleDragEnter = useCallback(
    (event: React.DragEvent) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      dragCounterRef.current += 1;
      setIsDraggingOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
    }
  }, []);

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
    },
    [disabled],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
      if (event.dataTransfer.files.length) {
        onDrop(event.dataTransfer.files);
      }
    },
    [disabled, onDrop],
  );

  return {
    isDraggingOver,
    resetDrag,
    dropZoneProps: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}
