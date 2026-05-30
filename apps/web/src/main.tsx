import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./components/error/ErrorBoundary";
import { ConfirmDialogProvider } from "./components/ui/ConfirmDialogProvider";
import { queryClient } from "./queries/queryClient";
import "./styles/theme.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ConfirmDialogProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </ConfirmDialogProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
