"use client";

import React from "react";

type AuthButtonVariant = "google" | "apple" | "primary" | "secondary" | "black" | "glass";

export interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AuthButtonVariant;
  loading?: boolean;
  startIcon?: React.ReactNode;
  testId?: string;
}

function getClasses(variant: AuthButtonVariant | undefined, disabled: boolean | undefined) {
  const base = [
    "w-full inline-flex items-center justify-center gap-3",
    "rounded-2xl px-4 py-3 text-sm font-semibold transition",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
    disabled ? "opacity-60 cursor-not-allowed" : "",
  ].join(" ");

  switch (variant) {
    case "google":
      return [
        base,
        "bg-white text-[#3c4043] shadow-md hover:shadow-lg",
        "ring-0",
        "data-[busy=true]:opacity-80",
        "border border-[#dadce0]",
      ].join(" ");
    case "apple":
      return [
        base,
        "bg-black text-white",
        "hover:bg-[#111]",
        "border border-white/10",
      ].join(" ");
    case "secondary":
      return [
        base,
        "bg-white/5 text-white",
        "border border-white/10 hover:bg-white/10",
      ].join(" ");
    case "black":
      return [
        base,
        "bg-black text-white",
        "hover:bg-[#111]",
        "border border-white/10",
      ].join(" ");
    case "glass":
      return [
        base,
        "bg-white/8 text-white/95",
        "ring-1 ring-white/15",
        "border border-white/10",
        "shadow-lg",
        "hover:bg-white/12",
      ].join(" ");
    case "primary":
    default:
      return [
        base,
        "bg-blue-500 text-white",
        "hover:brightness-110",
      ].join(" ");
  }
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  children,
  variant = "primary",
  loading = false,
  startIcon,
  testId,
  disabled,
  className,
  ...rest
}) => {
  return (
    <button
      {...rest}
      data-testid={testId}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={[getClasses(variant, disabled || loading), className || ""].join(" ")}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/70 border-t-transparent" />
      ) : (
        startIcon ?? null
      )}
      <span>{children}</span>
    </button>
  );
};

export default AuthButton;
