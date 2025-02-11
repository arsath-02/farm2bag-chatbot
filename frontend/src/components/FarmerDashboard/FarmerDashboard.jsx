import React, { useState, useEffect } from "react";
import axios from "axios";

const FarmerDashboard = () => {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({ name: "", price: "", quantity: "", harvestDate: "" });
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get("http://localhost:8080/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:8080/products/add", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      fetchProducts();
    } catch (error) {
      console.error("Error adding product:", error);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h2 className="text-3xl font-semibold text-green-600 mb-4">📦 Manage Your Products</h2>

      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-md">
        <input type="text" name="name" placeholder="Product Name" value={formData.name} onChange={handleChange} required className="w-full p-2 border rounded-md mb-2" />
        <input type="number" name="price" placeholder="Price per Unit" value={formData.price} onChange={handleChange} required className="w-full p-2 border rounded-md mb-2" />
        <input type="number" name="quantity" placeholder="Available Quantity" value={formData.quantity} onChange={handleChange} required className="w-full p-2 border rounded-md mb-2" />
        <input type="date" name="harvestDate" value={formData.harvestDate} onChange={handleChange} required className="w-full p-2 border rounded-md mb-2" />

        <button type="submit" className="w-full bg-green-600 text-white p-2 rounded-md">Add Product</button>
      </form>

      <h3 className="text-2xl font-semibold text-gray-700 mt-6">📋 Your Products</h3>
      <ul className="bg-white p-4 rounded-lg shadow-md">
        {products.length === 0 ? <p>No products added yet.</p> : products.map((product) => (
          <li key={product._id} className="p-2 border-b">
            <strong>{product.name}</strong> - ₹{product.price} | {product.quantity} available
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FarmerDashboard;
