import { useState } from "react";
import SubmitSuggestion from "./pages/SubmitSuggestion";
import CheckSuggestion from "./pages/CheckSuggestion";

function App() {
  const [page, setPage] = useState<"submit" | "check">("submit");

  if (page === "check") {
    return <CheckSuggestion onBack={() => setPage("submit")} />;
  }

  return <SubmitSuggestion onCheckStatus={() => setPage("check")} />;
}

export default App;
