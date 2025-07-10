import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "./api"; // or "../api" if it's placed in Components

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(false);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/`, { withCredentials: true })
      .then((res) => {
        if (res.data.authenticated) {
          localStorage.setItem("user", JSON.stringify({ username: res.data.user }));
          setAuth(true);
        } else {
          localStorage.removeItem("user");
          setAuth(false);
        }
      })
      .catch(() => {
        localStorage.removeItem("user");
        setAuth(false);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white text-center mt-20">Checking session...</div>;

  if (!auth) return <Navigate to="/" replace />;
  return children;
};

export default ProtectedRoute;
