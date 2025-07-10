import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../Components/api';

const Home = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/`, { withCredentials: true })
      .then((res) => {
        if (res.data.authenticated) {
          localStorage.setItem("user", JSON.stringify({ username: res.data.user }));
          navigate("/dashboard/chat");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAuth = async () => {
    const endpoint = isSignup ? "signup" : "login";
    setMessage("");

    try {
      const response = await axios.post(
        `${API_BASE_URL}/${endpoint}`,
        { username, password },
        { withCredentials: true }
      );

      if (response.data.success) {
        if (isSignup) {
          setIsSignup(false);
          setUsername("");
          setPassword("");
          setMessage("Signup successful! You can now log in.");
        } else {
          localStorage.setItem("user", JSON.stringify({ username }));
          navigate("/dashboard/chat");
        }
      } else {
        setMessage(response.data.message || "Something went wrong.");
      }
    } catch (err) {
      console.error(err);
      let msg = "Something went wrong.";
      if (err.response?.status === 409) {
        msg = "Account already in use.";
      } else if (err.response?.status === 401) {
        msg = "Invalid credentials. Please try again.";
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      setMessage(msg);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '10rem', color: '#333' }}>
        Checking session...
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.heading}>
          {isSignup ? "Sign Up" : "Login"}
        </h1>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <button onClick={handleAuth} style={styles.button}>
          {isSignup ? "Create Account" : "Login"}
        </button>

        {message && (
          <p style={{ ...styles.message, color: message.includes("successful") ? "#0a0" : "#222" }}>
            {message}
          </p>
        )}

        <p style={styles.toggle}>
          {isSignup ? (
            <>
              Already have an account?{" "}
              <span style={styles.link} onClick={() => { setIsSignup(false); setMessage(""); }}>
                Login
              </span>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <span style={styles.link} onClick={() => { setIsSignup(true); setMessage(""); }}>
                Sign up
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    height: '100vh',
    backgroundColor: '#f5f6fb',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Poppins, sans-serif',
    padding: '2rem',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    boxShadow: '0 4px 25px rgba(0,0,0,0.08)',
    padding: '2.5rem 2.8rem',
    width: '340px',
    maxWidth: '100%',
    textAlign: 'center',
  },
  heading: {
    fontSize: '2.2rem',
    fontWeight: 600,
    marginBottom: '2rem',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '1rem 1.2rem',
    marginBottom: '1.2rem',
    fontSize: '1.25rem',
    borderRadius: '8px',
    border: '1px solid #ccc',
    backgroundColor: '#fafafa',
    outline: 'none',
    color: '#333',
  },
  button: {
    width: '100%',
    padding: '1rem',
    fontSize: '1.25rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#5A4BFF',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    marginTop: '0.3rem',
  },
  message: {
    fontSize: '1.1rem',
    marginTop: '1.2rem',
    backgroundColor: '#f0f0f0',
    padding: '0.7rem',
    borderRadius: '6px',
  },
  toggle: {
    fontSize: '1.15rem',
    marginTop: '1.5rem',
    color: '#555',
  },
  link: {
    color: '#5A4BFF',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};

export default Home;
