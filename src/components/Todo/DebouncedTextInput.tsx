import React, { useEffect, useRef, useState } from 'react';
import { TextInput, TextInputProps } from '@mantine/core';

interface Props extends Omit<TextInputProps, 'onChange' | 'value'> {
  value: string;
  onCommit: (value: string) => void;
  debounceMs?: number;
}

/**
 * TextInput that holds typing locally and only fires onCommit after the user
 * stops typing for `debounceMs` (default 500ms). Also commits on blur.
 *
 * Sync from upstream value updates is only applied when the input is unfocused
 * AND no pending commit is in flight — so external optimistic updates don't
 * fight the user's typing.
 */
const DebouncedTextInput: React.FC<Props> = ({
  value,
  onCommit,
  debounceMs = 500,
  onBlur,
  ...rest
}) => {
  const [local, setLocal] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const focusedRef = useRef(false);

  // Sync from upstream when user is not typing
  useEffect(() => {
    if (!focusedRef.current && !dirtyRef.current) {
      setLocal(value);
    }
  }, [value]);

  const flush = (val: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (dirtyRef.current) {
      dirtyRef.current = false;
      onCommit(val);
    }
  };

  return (
    <TextInput
      {...rest}
      value={local}
      onFocus={(e) => {
        focusedRef.current = true;
        rest.onFocus?.(e);
      }}
      onChange={(e) => {
        const next = e.target.value;
        setLocal(next);
        dirtyRef.current = true;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (dirtyRef.current) {
            dirtyRef.current = false;
            onCommit(next);
          }
          timeoutRef.current = null;
        }, debounceMs);
      }}
      onBlur={(e) => {
        focusedRef.current = false;
        flush(local);
        onBlur?.(e);
      }}
    />
  );
};

export default DebouncedTextInput;
