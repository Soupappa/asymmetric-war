import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import RootErrorBoundary from "./RootErrorBoundary.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
);
