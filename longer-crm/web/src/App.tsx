import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useSession } from "./lib/useSession";
import { Layout } from "./components/Layout";
import { Auth } from "./screens/Auth";
import { Book } from "./screens/Book";
import { Capture } from "./screens/Capture";
import { CallDetail } from "./screens/CallDetail";
import { Meetings } from "./screens/Meetings";
import { Spinner } from "./components/ui";

export default function App() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div className="grid min-h-full place-items-center">
        <Spinner className="text-gold" />
      </div>
    );
  }

  if (!session) return <Auth />;

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Book />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/call/:id" element={<CallDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
