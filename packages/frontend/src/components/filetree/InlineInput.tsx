import { useState, useRef, useEffect } from 'react';

interface Props {
  defaultValue?: string;
  depth: number;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function InlineInput({ defaultValue = '', depth, onConfirm, onCancel }: Props) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (defaultValue) {
      const dotIndex = defaultValue.lastIndexOf('.');
      if (dotIndex > 0) {
        inputRef.current?.setSelectionRange(0, dotIndex);
      } else {
        inputRef.current?.select();
      }
    }
  }, [defaultValue]);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onConfirm(trimmed);
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className="flex items-center h-7"
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleConfirm}
        className="flex-1 h-5 px-1 text-xs bg-surface0 border border-accent rounded text-text outline-none"
      />
    </div>
  );
}
