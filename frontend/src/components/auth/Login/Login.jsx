import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import "./Login.css";

// Define the WebSocket server URL
const SOCKET_SERVER_URL = "http://localhost:8080";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    userType: "", // Customer or Farmer
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  let socket = null;

  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  // Validate form data
  const validateFormData = (data) => {
    if (!data.email || !data.password || !data.userType) {
      return "All fields are required";
    }
    return null;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    const validationError = validateFormData(formData);
    if (validationError) {
      setErrorMessage(validationError);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8080/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (!response.ok) {
          setErrorMessage(data.message || "Login failed. Please try again.");
          setLoading(false);
          return;
        }

        // Save token & user role
        const { token, user } = data.data;
        localStorage.setItem("userRole", user.userType);
        localStorage.setItem("token", token);

        // Establish WebSocket connection only after successful login
        socket = io(SOCKET_SERVER_URL, {
          query: { token },
        });

        alert("Login successful!");
        navigate("/chat");
      } else {
        setErrorMessage("Unexpected response format");
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">Sign In</h2>
        {errorMessage && <p className="error-text">{errorMessage}</p>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="userType">User Type</label>
            <select
              id="userType"
              name="userType"
              value={formData.userType}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Select User Type</option>
              <option value="customer">Customer</option>
              <option value="farmer">Farmer</option>
            </select>
          </div>

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="signup-text">
          Don't have an account?{" "}
          <span onClick={() => navigate("/auth/register")} className="signup-link">
            Sign Up
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
