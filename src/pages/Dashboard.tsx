import { Navigate } from "react-router-dom";

export default function Dashboard() {
  // Redirect to Conversations as the default dashboard view
  return <Navigate to="/" replace />;
}
