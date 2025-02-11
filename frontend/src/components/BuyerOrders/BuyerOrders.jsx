import React, { useState, useEffect } from "react";
import axios from "axios";

const BuyerOrders = () => {
  const [products, setProducts] = useState([]);
  const [order, setOrder] = useState({ productName: "", quantity: "" });
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

  const handleOrder = async () => {
    try {
      await axios.post("http://localhost:8080/orders/place", order, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      alert("Order placed successfully!");
    } catch (error) {
      console.error("Error placing order:", error);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h2 className="text-3xl font-semibold text-green-600 mb-4">🛒 Place an Order</h2>

      <select onChange={(e) => setOrder({ ...order, productName: e.target.value })} className="w-full p-2 border rounded-md mb-2">
        <option>Select a product</option>
        {products.map((product) => (
          <option key={product._id} value={product.name}>{product.name} - ₹{product.price}/kg</option>
        ))}
      </select>
      <input type="number" name="quantity" placeholder="Quantity" onChange={(e) => setOrder({ ...order, quantity: e.target.value })} className="w-full p-2 border rounded-md mb-2" />
      <button onClick={handleOrder} className="w-full bg-green-600 text-white p-2 rounded-md">Place Order</button>
    </div>
  );
};

export default BuyerOrders;
