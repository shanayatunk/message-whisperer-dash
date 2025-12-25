import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Debug helper: set sessionStorage.debug_fetch=1 to log any http://staging-api requests
if (sessionStorage.getItem("debug_fetch") === "1") {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url?.startsWith("http://staging-api.feelori.com")) {
      console.error("[fetch] Insecure request detected:", url);
      console.error("[fetch] Called from:\n", new Error("Insecure fetch").stack);
    }
    return originalFetch(input, init);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
