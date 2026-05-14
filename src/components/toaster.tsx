"use client";

import { Toaster } from "react-hot-toast";

/** Dark surfaces tinted with theme primary / destructive (uses OKLCH + color-mix). */
const darkPrimaryToast = {
  background:
    "color-mix(in oklch, var(--primary) 28%, oklch(0.13 0.04 58) 72%)",
  color: "#ffffff",
  border: "1px solid color-mix(in oklch, var(--primary) 48%, transparent)",
  boxShadow:
    "0 12px 40px -12px color-mix(in oklch, var(--primary) 32%, transparent)",
  borderRadius: "var(--radius-lg, 0.625rem)",
} as const;

const darkPrimaryToastSuccess = {
  ...darkPrimaryToast,
  border: "1px solid color-mix(in oklch, var(--primary) 62%, transparent)",
  boxShadow:
    "0 12px 44px -10px color-mix(in oklch, var(--primary) 38%, transparent)",
} as const;

const darkDestructiveToast = {
  background:
    "color-mix(in oklch, var(--destructive) 24%, oklch(0.14 0.05 25) 76%)",
  color: "#ffffff",
  border: "1px solid color-mix(in oklch, var(--destructive) 45%, transparent)",
  boxShadow:
    "0 12px 40px -12px color-mix(in oklch, var(--destructive) 28%, transparent)",
  borderRadius: "var(--radius-lg, 0.625rem)",
} as const;

export function HotToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          ...darkPrimaryToast,
          fontWeight: 500,
        },
        success: {
          style: darkPrimaryToastSuccess,
          iconTheme: {
            primary: "color-mix(in oklch, var(--primary) 85%, white)",
            secondary:
              "color-mix(in oklch, var(--primary) 35%, oklch(0.12 0.04 58))",
          },
        },
        error: {
          style: darkDestructiveToast,
          iconTheme: {
            primary: "oklch(0.97 0.01 95)",
            secondary:
              "color-mix(in oklch, var(--destructive) 45%, oklch(0.12 0.05 25))",
          },
        },
        loading: {
          style: {
            ...darkPrimaryToast,
            opacity: 0.95,
          },
          iconTheme: {
            primary: "color-mix(in oklch, var(--primary) 75%, white)",
            secondary:
              "color-mix(in oklch, var(--primary) 30%, oklch(0.12 0.04 58))",
          },
        },
      }}
    />
  );
}
