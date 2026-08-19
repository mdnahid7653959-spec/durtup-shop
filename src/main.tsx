// MegaMart E-commerce Application - v2.1 - Cache Bust 20260118
import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/scroll-reset.css";

// Global error handler to prevent native app crashes from unhandled async errors
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  event.preventDefault();
});

window.addEventListener("error", (event) => {
  console.error("Unhandled error:", event.error);
});

// Auto-register Service Worker for instant background push notifications on phone
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      console.log("[Storefront SW] Registered for push notifications:", reg.scope);
    }).catch((err) => {
      console.warn("[Storefront SW] Registration warning:", err);
    });
  });
}

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
