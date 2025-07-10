import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';
import './Home.css';
import API_BASE_URL from '../Components/api'; // adjust path if needed

const Home = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true); // 👈 NEW: loading state
  const navigate = useNavigate();

  // ✅ Auto-redirect if already logged in
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/`, { withCredentials: true })
      .then((res) => {
        if (res.data.authenticated) {
          localStorage.setItem("user", JSON.stringify({ username: res.data.user }));
          navigate("/dashboard/chat");
        }
      })
      .catch(() => {
        // not logged in — stay on login page
      })
      .finally(() => setLoading(false)); // 👈 stop loading regardless
  }, []);

  const handleAuth = async () => {
    const endpoint = isSignup ? "signup" : "login";
    try {
      const response = await axios.post(
        `${API_BASE_URL}/${endpoint}`,
        { username, password },
        { withCredentials: true }
      );

      if (response.data.success) {
        if (!isSignup) {
          localStorage.setItem("user", JSON.stringify({ username }));
          navigate("/dashboard/chat");
        } else {
          setIsSignup(false);
          setUsername("");
          setPassword("");
          setError("Signup successful! You can now log in.");
        }
      } else {
        setError(response.data.message || "Something went wrong.");
      }
    } catch (err) {
      console.error(err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Server error. Please try again later.");
      }
    }
  };

  // ✅ Don't show the login screen while checking session
  if (loading) {
    return <div className="text-white text-center mt-20">Checking session...</div>;
  }

  return (
    <div className="Home">
      <div className="auth-card">
        <h1 className="text-3xl font-bold mb-6 text-center">
          {isSignup ? "Sign Up for DevBot" : "Login to DevBot"}
        </h1>

        <input
          type="text"
          placeholder="Username"
          className="auth-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="auth-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleAuth} className="auth-button">
          {isSignup ? "Sign Up" : "Login"}
        </button>

        {error && <p className="error-msg">{error}</p>}

        <p className="auth-toggle-text">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <span onClick={() => { setIsSignup(false); setError(""); }}>
                Login
              </span>
            </>
          ) : (
            <>
              Don’t have an account?{" "}
              <span onClick={() => { setIsSignup(true); setError(""); }}>
                Sign up
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Home;
