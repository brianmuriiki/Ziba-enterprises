import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./lib/auth-context";
import "./index.css";

try {
  if (localStorage.getItem("ziba.theme") === "dark") document.documentElement.dataset.theme = "dark";
} catch {}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
