'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

type ResponsiveModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  /** Tailwind max-width class, e.g. max-w-2xl */
  maxWidthClass?: string;
};

/**
 * Centered modal with sticky header/footer and a scrollable body.
 * Full-height on mobile; constrained height on larger screens.
 */
export function ResponsiveModal({
  title,
  description,
  onClose,
  children,
  footer,
  maxWidthClass = 'max-w-2xl',
}: ResponsiveModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center overflow-hidden bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`flex min-h-0 w-full flex-col bg-white shadow-xl ${maxWidthClass} h-[100dvh] max-h-[100dvh] rounded-none sm:h-auto sm:max-h-[min(90dvh,900px)] sm:rounded-lg`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="responsive-modal-title"
      >
        <header className="z-10 flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
          <div className="min-w-0 pr-2">
            <h2
              id="responsive-modal-title"
              className="text-lg font-bold text-gray-900 sm:text-xl"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-m-1 shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </div>

        <footer className="z-10 flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200 bg-white px-4 py-3 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-4">
          {footer}
        </footer>
      </div>
    </div>
  );
}
