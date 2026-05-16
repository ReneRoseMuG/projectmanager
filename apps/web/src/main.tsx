import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./components/error/ErrorBoundary";
import { ConfirmDialogProvider } from "./components/ui/ConfirmDialogProvider";
import { ToastProvider } from "./components/ui/ToastProvider";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <ConfirmDialogProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </ConfirmDialogProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
