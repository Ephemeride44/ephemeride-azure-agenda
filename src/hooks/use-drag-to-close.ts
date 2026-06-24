"use client";

import { useRef, useState, type TouchEvent } from "react";

/**
 * Gestion du glissé vertical d'un tiroir (bottom sheet) : la zone de préhension
 * suit le doigt vers le bas et ferme au-delà d'un seuil, comme un vrai tiroir.
 *
 * Renvoie le décalage courant `dragY` (à appliquer en `translateY`) et les
 * handlers tactiles à poser sur la zone à glisser.
 */
export function useDragToClose(onClose: () => void, threshold = 80) {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);

  const handlers = {
    onTouchStart: (e: TouchEvent) => {
      startY.current = e.touches[0].clientY;
    },
    onTouchMove: (e: TouchEvent) => {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) setDragY(dy);
    },
    onTouchEnd: () => {
      if (dragY > threshold) onClose();
      setDragY(0);
      startY.current = null;
    },
  };

  return { dragY, handlers };
}
