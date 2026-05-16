import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import { ConfirmDialog, type ConfirmOptions } from "./ConfirmDialog";

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((nextOptions: ConfirmOptions) => {
    setOptions(nextOptions);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {options ? <ConfirmDialog open={Boolean(options)} options={options} onCancel={() => close(false)} onConfirm={() => close(true)} /> : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used inside ConfirmDialogProvider");
  }
  return context;
}
