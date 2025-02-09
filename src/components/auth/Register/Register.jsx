import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";

// Define the WebSocket server URL
const SOCKET_SERVER_URL = "http://localhost:8080";

const Register = () => {
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    confirmPassword: "",
    phonenumber: "",
    userType: "", // Customer or Farmer
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Clean up WebSocket connection on component unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  // Validate form data
  const validateFormData = (data) => {
    if (!data.firstname || !data.lastname || !data.email || !data.password || !data.phonenumber || !data.userType) {
      return "All fields are required";
    }
    if (data.password !== data.confirmPassword) {
      return "Passwords do not match";
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
      const response = await fetch("http://localhost:8080/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok) {
        setErrorMessage(result.message || "Registration failed");
        setLoading(false);
        return;
      }

      // Save token & alert success
      localStorage.setItem("token", result.data.token);
      alert("Registration successful!");

      // Establish WebSocket connection only after successful registration
      const newSocket = io(SOCKET_SERVER_URL, {
        query: { token: result.data.token },
      });
      setSocket(newSocket);

      navigate("/auth/login");
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center bg-gray-100 min-h-screen items-center">
      <div className="bg-white p-10 rounded-md w-full max-w-md shadow-lg">
        <h1 className="text-3xl font-semibold text-center text-green-600 mb-4">
          Create An Account
        </h1>
        {errorMessage && <p className="text-red-500 text-center mb-2">{errorMessage}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <label htmlFor="userType" className="block text-sm font-medium text-gray-700">
              User Type
            </label>
            <select
  id="userType"
  name="userType"
  value={formData.userType}
  onChange={handleChange}
  className="w-full mt-1 p-2 border rounded-md focus:ring-green-500 text-black bg-white"
>
  <option value="" className="text-black">Select User Type</option>
  <option value="customer" className="text-black">Customer</option>
  <option value="farmer" className="text-black">Farmer</option>
</select>
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input
              type="text"
              name="firstname"
              value={formData.firstname}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md text-gray-600"
            />
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <input
              type="text"
              name="lastname"
              value={formData.lastname}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md text-gray-600"
            />
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md text-gray-600"
            />
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              name="phonenumber"
              value={formData.phonenumber}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md text-gray-600"
            />
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md text-gray-600"
            />
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md text-gray-600"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-4 p-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 focus:ring-green-500"
            disabled={loading}
          >
            {loading ? "Signing Up..." : "Sign Up"}
          </button>
        </form>

        <p className="text-sm text-center text-gray-600 mt-4">
          Already have an account?{" "}
          <span onClick={() => navigate("/auth/login")} className="text-green-600 cursor-pointer hover:underline">
            Sign In
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;
