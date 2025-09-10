"use client";

import React, { useEffect, useMemo, useRef } from "react";

export interface OtpInputProps {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  disabled?: boolean;
  testId?: string;
}

const isDigit = (s: string) => /^[0-9]$/.test(s);

export const OtpInput: React.FC<OtpInputProps> = ({ value, onChange, length = 6, disabled, testId }) => {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const chars = useMemo(() => value.padEnd(length, " ").slice(0, length).split("") , [value, length]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text")?.trim() ?? "";
      if (text.length === length && /^[0-9]+$/.test(text)) {
        e.preventDefault();
        onChange(text);
        inputsRef.current[length - 1]?.focus();
      }
    };
    const node = inputsRef.current[0]?.parentElement;
    if (node) node.addEventListener("paste", handlePaste as any);
    return () => { if (node) node.removeEventListener("paste", handlePaste as any); };
  }, [length, onChange]);

  return (
    <div className="flex items-center gap-2" aria-label="Engångskod" role="group" data-testid={testId}>
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => (inputsRef.current[idx] = el)}
          inputMode="numeric"
          aria-label={`Siffra ${idx + 1}`}
          className="w-9 h-11 text-center rounded-2xl bg-white/5 text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          maxLength={1}
          value={chars[idx] === " " ? "" : chars[idx]}
          disabled={disabled}
          onChange={(e) => {
            const ch = e.target.value.slice(-1);
            if (!isDigit(ch)) { e.target.value = ""; return; }
            const next = (value.slice(0, idx) + ch + value.slice(idx + 1)).slice(0, length);
            onChange(next);
            if (idx < length - 1) inputsRef.current[idx + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              if ((value[idx] ?? "") === "" && idx > 0) inputsRef.current[idx - 1]?.focus();
              const next = (value.slice(0, idx) + "" + value.slice(idx + 1)).slice(0, length);
              onChange(next);
            }
            if (e.key === "ArrowLeft" && idx > 0) inputsRef.current[idx - 1]?.focus();
            if (e.key === "ArrowRight" && idx < length - 1) inputsRef.current[idx + 1]?.focus();
          }}
        />
      ))}
    </div>
  );
};

export default OtpInput;
