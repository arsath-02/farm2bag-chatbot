import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    userType: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post("http://localhost:8080/auth/register", formData);
      console.log("Registration successful:", response.data);
      navigate("/auth/login");
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage("Registration failed. Please try again.");
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
              name="phone"
              value={formData.phone}
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