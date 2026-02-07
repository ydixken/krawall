"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  className = "",
  children,
  footer,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full max-w-lg rounded-lg border border-gray-800 bg-gray-900 shadow-xl animate-slideIn ${className}`}
      >
        {(title || true) && (
          <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
            {title && (
              <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
            )}
            <button
              onClick={onClose}
              className="ml-auto rounded-md p-1 text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-gray-800 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
