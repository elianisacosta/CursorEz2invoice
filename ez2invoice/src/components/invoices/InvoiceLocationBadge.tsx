'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import type { ResolvedInvoiceLocation, ShopLocationRow } from '@/lib/invoices/resolveInvoiceLocation';
import {
  getLocationPopoverPosition,
  handleLocationBadgeClick,
  isElementVisibleForInteraction,
  shouldCloseOnOutsidePointer,
} from '@/lib/invoices/invoiceLocationBadgeInteraction';

export {
  handleLocationBadgeClick,
  isElementVisibleForInteraction,
  shouldCloseOnOutsidePointer,
} from '@/lib/invoices/invoiceLocationBadgeInteraction';

type InvoiceLocationBadgeProps = {
  invoiceId: string;
  resolved: ResolvedInvoiceLocation;
  locations: ShopLocationRow[];
  locationsLoading?: boolean;
  locationsError?: string | null;
  isOpen: boolean;
  isSaving: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (locationId: string) => void;
  onClear: () => void;
  onAddLocation: (name: string) => Promise<void>;
};

export function InvoiceLocationBadge({
  resolved,
  locations,
  locationsLoading = false,
  locationsError = null,
  isOpen,
  isSaving,
  onOpen,
  onClose,
  onSelect,
  onClear,
  onAddLocation,
}: InvoiceLocationBadgeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [interactionActive, setInteractionActive] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addingLocation, setAddingLocation] = useState(false);

  useLayoutEffect(() => {
    if (!isOpen) {
      setInteractionActive(false);
      setPopoverPosition(null);
      return;
    }
    const button = buttonRef.current;
    const visible = isElementVisibleForInteraction(button);
    setInteractionActive(visible);
    if (visible && button) {
      setPopoverPosition(getLocationPopoverPosition(button));
    }
  }, [isOpen, locations.length, locationsLoading, locationsError]);

  useEffect(() => {
    if (!isOpen || !interactionActive) return;

    const updatePosition = () => {
      const button = buttonRef.current;
      if (!button || !isElementVisibleForInteraction(button)) return;
      setPopoverPosition(getLocationPopoverPosition(button));
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, interactionActive]);

  useEffect(() => {
    if (!isOpen || !interactionActive) return;

    let listener: ((event: MouseEvent) => void) | null = null;
    const timeoutId = window.setTimeout(() => {
      listener = (event: MouseEvent) => {
        if (
          shouldCloseOnOutsidePointer(
            rootRef.current,
            popoverRef.current,
            event.target as Node,
            isElementVisibleForInteraction(buttonRef.current)
          )
        ) {
          onClose();
        }
      };
      document.addEventListener('mousedown', listener);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      if (listener) document.removeEventListener('mousedown', listener);
    };
  }, [isOpen, interactionActive, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setAdding(false);
      setNewLocationName('');
      setAddError(null);
    }
  }, [isOpen]);

  const label = resolved.displayName || '+ Location';
  const isEmpty = !resolved.displayName;
  const showPopover = isOpen && interactionActive && popoverPosition && typeof document !== 'undefined';

  const popover = showPopover
    ? createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[200] w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          style={{ top: popoverPosition.top, left: popoverPosition.left }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Location
          </div>
          {resolved.source === 'digital' && resolved.displayName && (
            <div className="px-3 pb-2 text-[11px] leading-snug text-blue-700">
              Current location is controlled by the Work Order.
              <div className="mt-1 font-medium">Showing: {resolved.displayName}</div>
            </div>
          )}
          {resolved.source === 'digital' && (
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Fallback location
            </div>
          )}
          {locationsLoading && (
            <div className="px-3 py-2 text-xs text-gray-500">Loading locations...</div>
          )}
          {locationsError && (
            <div className="px-3 py-2 text-xs text-red-600">{locationsError}</div>
          )}
          {!locationsLoading && !locationsError && locations.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-500">No locations yet. Add one below.</div>
          )}
          <div className="max-h-48 overflow-y-auto">
            {locations.map((location) => {
              const selected =
                resolved.manualLocationId === location.id ||
                (resolved.source === 'manual' && resolved.displayName === location.name);
              return (
                <button
                  key={location.id}
                  type="button"
                  className={`flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                    selected ? 'text-primary-700 font-medium' : 'text-gray-700'
                  }`}
                  onClick={() => onSelect(location.id)}
                >
                  <span className="w-4 shrink-0">{selected ? '✓' : ''}</span>
                  <span className="truncate">{location.name}</span>
                </button>
              );
            })}
          </div>
          {resolved.manualLocationId && (
            <button
              type="button"
              className="w-full px-3 py-1.5 text-left text-sm text-gray-500 hover:bg-gray-50"
              onClick={onClear}
            >
              {resolved.source === 'digital' ? 'Clear fallback location' : 'Clear manual location'}
            </button>
          )}
          <div className="border-t border-gray-100 px-2 py-2">
            {addError && <div className="mb-1 px-1 text-xs text-red-600">{addError}</div>}
            {adding ? (
              <form
                className="flex items-center gap-1"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const trimmed = newLocationName.trim();
                  if (!trimmed) return;
                  setAddingLocation(true);
                  setAddError(null);
                  try {
                    await onAddLocation(trimmed);
                    setNewLocationName('');
                    setAdding(false);
                  } catch (error) {
                    setAddError(
                      error instanceof Error ? error.message : 'Could not add location. Please try again.'
                    );
                  } finally {
                    setAddingLocation(false);
                  }
                }}
              >
                <input
                  type="text"
                  value={newLocationName}
                  onChange={(event) => setNewLocationName(event.target.value)}
                  placeholder="New location"
                  className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
                  autoFocus
                  disabled={addingLocation}
                />
                <button
                  type="submit"
                  className="text-xs font-medium text-primary-700 disabled:opacity-50"
                  disabled={addingLocation}
                >
                  Add
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-800"
                onClick={() => {
                  setAdding(true);
                  setAddError(null);
                }}
              >
                <Plus className="h-3 w-3" />
                Add location
              </button>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          handleLocationBadgeClick(isOpen, { onOpen, onClose });
        }}
        disabled={isSaving}
        className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 transition-colors ${
          isEmpty
            ? 'border-dashed border-gray-300 text-gray-500 hover:border-primary-300 hover:text-primary-700'
            : resolved.source === 'digital'
              ? 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100'
              : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
        } disabled:opacity-50`}
        title={
          resolved.source === 'digital'
            ? `${resolved.displayName} — automatic from Work Order`
            : 'Set invoice location'
        }
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {resolved.source === 'digital' && resolved.displayName ? (
          <span className="flex max-w-full flex-col items-start leading-tight text-left">
            <span className="truncate">{resolved.displayName}</span>
            <span className="text-[9px] font-normal opacity-80">From Work Order</span>
          </span>
        ) : (
          <span className="truncate">{label}</span>
        )}
      </button>
      {popover}
    </div>
  );
}
