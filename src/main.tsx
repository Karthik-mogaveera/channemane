import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./ui/styles/index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find root element with id 'root'");
}

const initialProps = typeof window !== "undefined" ? (window as any).__CHANNEMANE_INITIAL_PROPS__ : undefined;

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App {...initialProps} />
  </React.StrictMode>
);
