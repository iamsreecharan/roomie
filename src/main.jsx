import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { PageBoundary } from "./components/ErrorBoundary.jsx";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "./styles.css";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PageBoundary>
      <App />
    </PageBoundary>
  </React.StrictMode>,
);
