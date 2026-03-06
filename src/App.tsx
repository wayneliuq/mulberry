import { RouterProvider } from "react-router-dom";
import { AdminSessionProvider } from "./features/admin/AdminSessionContext";
import { appRouter } from "./router";

export default function App() {
  return (
    <AdminSessionProvider>
      <RouterProvider router={appRouter} />
    </AdminSessionProvider>
  );
}
