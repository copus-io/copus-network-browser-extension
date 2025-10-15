import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { UploadImage } from "./screens/UploadImage";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <UploadImage />
  </StrictMode>,
);
