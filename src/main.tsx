import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/geist/600.css";
import "@fontsource/geist-mono/400.css";
import { App } from "./App";
import "./styles.css";

const blockedBrowserShortcutKeys = new Set(["p", "r", "s", "u"]);
const blockedDevtoolsShortcutKeys = new Set(["c", "i", "j"]);

document.addEventListener("contextmenu", (event) => event.preventDefault());
document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const commandKey = event.ctrlKey || event.metaKey;
  const isBrowserShortcut = commandKey && !event.shiftKey && blockedBrowserShortcutKeys.has(key);
  const isDevtoolsShortcut =
    event.key === "F12" ||
    (commandKey && event.shiftKey && blockedDevtoolsShortcutKeys.has(key));
  const isNavigationShortcut = event.altKey && (key === "arrowleft" || key === "arrowright");

  if (isBrowserShortcut || isDevtoolsShortcut || isNavigationShortcut) {
    event.preventDefault();
  }
});

const root = document.getElementById("root");

if (!root) {
  throw new Error("Elemento raiz não encontrado.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
