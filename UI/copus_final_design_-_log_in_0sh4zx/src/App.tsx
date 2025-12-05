import React from "react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Create } from "./screens/Create";
import { LogIn } from "./screens/LogIn/LogIn";
import { UploadImage } from "./routes/UploadImage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <LogIn />,
  },
  {
    path: "/log-in",
    element: <LogIn />,
  },
  {
    path: "/create",
    element: <Create />,
  },
  {
    path: "/upload-image",
    element: <UploadImage />,
  },
]);

export const App = () => {
  return <RouterProvider router={router} />;
};
