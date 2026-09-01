'use client';

import { useRef } from 'react';
import { formatPhoneInputWithCursor } from '@/lib/customers/phoneNumber';

type CustomerPhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function CustomerPhoneInput({
  value,
  onChange,
  onBlur,
  className,
  placeholder = '(555) 123-4567',
  disabled = false,
}: CustomerPhoneInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <input
      ref={inputRef}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      onChange={(event) => {
        const { formatted, cursor } = formatPhoneInputWithCursor(
          event.target.value,
          event.target.selectionStart ?? event.target.value.length
        );
        onChange(formatted);
        requestAnimationFrame(() => {
          const input = inputRef.current;
          if (!input) return;
          input.setSelectionRange(cursor, cursor);
        });
      }}
      onBlur={onBlur}
    />
  );
}
