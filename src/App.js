import { useState } from "react";
import Admin from "./pages/Admin";
import MatchWorksheet from "./pages/MatchWorksheet";

export default function App() {
  const [page, setPage] = useState("admin");

  return (
    <div style={{ minHeight: "100vh", background: "#0f2115" }}>
      <div style={{
        padding: 20,
        display: "flex",
        gap: 12
      }}>
        <button onClick={() => setPage("admin")}>Admin</button>
        <button onClick={() => setPage("worksheet")}>Match Worksheet</button>
      </div>

      {page === "admin" && <Admin />}
      {page === "worksheet" && <MatchWorksheet />}
    </div>
  );
}
``