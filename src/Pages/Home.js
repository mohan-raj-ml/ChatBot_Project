import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';
import './Home.css'; // If separated styling is used

const Home = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleAuth = async () => {
    const endpoint = isSignup ? "signup" : "login";
    try {
      const response = await axios.post(
        `http://localhost:5000/${endpoint}`,
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

        <button
          onClick={handleAuth}
          className="auth-button"
        >
          {isSignup ? "Sign Up" : "Login"}
        </button>

        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}

        <p className="text-sm text-gray-300 mt-6 text-center">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <span
                className="text-indigo-400 underline cursor-pointer"
                onClick={() => {
                  setIsSignup(false);
                  setError("");
                }}
              >
                Login
              </span>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <span
                className="text-indigo-400 underline cursor-pointer"
                onClick={() => {
                  setIsSignup(true);
                  setError("");
                }}
              >
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
