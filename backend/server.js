import express from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import { Server } from "socket.io";
import fetch from "node-fetch";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import authRoutes from "./routes/auth.js";
import User from "./models/user.js";
import Product from "./models/products.js";
import Order from "./models/order.js";

dotenv.config();

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ MongoDB Error:", err));

// Use Routes
app.use("/auth", authRoutes);

const runFastAPIModel = async (message, userId) => {
  try {
    console.log(`📡 Sending message to FastAPI: ${message} for user: ${userId}`);

    const response = await fetch("https://farm2bag-chatbot.onrender.com/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, userId }),
    });
    
    if (!response.ok) {
      throw new Error(`FastAPI Model Error: ${response.statusText}`);
    }

    const jsonResponse = await response.json();
    console.log(`🤖 FastAPI Response: ${JSON.stringify(jsonResponse)}`);

    const { intent, entities } = jsonResponse.response;
    const products = entities?.products ? [entities.products] : [];
    const orders = entities?.orders ? [entities.orders] : [];

    switch (intent) {
      // ✅ 1. Product Management
      case "add_product": {
  if (!entities.products) return "❌ No product details provided.";

  const { name, price, quantity } = entities.products;
  if (!name || !price || !quantity) return "❌ Invalid product details.";

  const productName = name.toLowerCase();
  const parsedPrice = parseFloat(price);
  const parsedQuantity = parseFloat(quantity);

  // Extract unit from price field (e.g., "50/kg" → unit: "kg")
  const priceMatch = price.match(/(\d+)(\/)([a-zA-Z]+)/);
  const unit = priceMatch ? priceMatch[3] : "kg"; // Default to kg

  // Ensure required fields are set
  const availability = "In Stock"; // Default availability
  const harvestDate = new Date(); // Set current date
  const category = getCategory(productName); // Function to determine category

  const existingProduct = await Product.findOne({ name: productName, farmerId: userId });

  if (existingProduct) {
    existingProduct.price = parsedPrice;
    existingProduct.quantity = parsedQuantity;
    existingProduct.unit = unit;
    existingProduct.availability = availability;
    existingProduct.harvestDate = harvestDate;
    existingProduct.category = category;
    await existingProduct.save();
    return `🔄 Updated '${productName}' successfully.`;
  } else {
    const newProduct = new Product({
      name: productName,
      price: parsedPrice,
      quantity: parsedQuantity,
      unit,
      availability,
      harvestDate,
      category,
      farmerId: userId,
    });
    await newProduct.save();
    return `✅ Product '${productName}' added successfully.`;
  }
}

// Helper function to determine category based on product name
function getCategory(productName) {
  const categories = {
    fruits: ["apple", "banana", "mango", "watermelon"],
    vegetables: ["tomato", "potato", "carrot"],
    grains: ["rice", "wheat", "millet"],
  };

  for (const [category, items] of Object.entries(categories)) {
    if (items.includes(productName)) return category;
  }
  return "General"; // Default category
}


case "update_product": {
  if (!entities.products) return "❌ No product details provided.";

  const { product_name, price, quantity } = entities.products;
  if (!product_name || !price || !quantity) return "❌ Invalid product details.";

  const productName = product_name.toLowerCase();
  
  // Extract numeric values
  const priceMatch = price.match(/(\d+)/);
  const parsedPrice = priceMatch ? parseFloat(priceMatch[1]) : null;

  const quantityMatch = quantity.match(/(\d+)/);
  const parsedQuantity = quantityMatch ? parseFloat(quantityMatch[1]) : null;

  // Extract unit from quantity
  const unitMatch = quantity.match(/[a-zA-Z]+/);
  const unit = unitMatch ? unitMatch[0] : "kg"; // Default to kg

  if (!parsedPrice || !parsedQuantity) return "❌ Invalid price or quantity format.";

  const availability = "In Stock";
  const harvestDate = new Date();
  const category = getCategory(productName);

  const existingProduct = await Product.findOne({ name: productName, farmerId: userId });

  if (existingProduct) {
    existingProduct.price = parsedPrice;
    existingProduct.quantity = parsedQuantity;
    existingProduct.unit = unit;
    existingProduct.availability = availability;
    existingProduct.harvestDate = harvestDate;
    existingProduct.category = category;
    await existingProduct.save();
    return `🔄 Updated '${productName}' successfully.`;
  } else {
    return `❌ Product '${productName}' not found for update.`;
  }
}


      case "delete_product": {
        if (products.length === 0) return "❌ No product specified.";
        const { name } = products[0];
        const productName = name.toLowerCase();

        const deleted = await Product.findOneAndDelete({ name: productName, farmerId: userId });
        return deleted ? `🗑️ Product '${productName}' deleted.` : `❌ '${productName}' not found.`;
      }

      case "view_listings":
      case "view_current_listings": {
        const productList = await Product.find({ farmerId: userId });
        if (productList.length === 0) return "📭 No products listed.";
        
        return productList.map(p => `${p.name}: ${p.quantity}kg at ₹${p.price}/kg`).join("\n");
      }

      case "check_availability": {
        if (products.length === 0) return "❌ No product specified.";
        const { name } = products[0];
        const productName = name.toLowerCase();

        const existingProduct = await Product.findOne({ name: productName, farmerId: userId });

        return existingProduct
          ? `✅ '${productName}' available: ${existingProduct.quantity}kg at ₹${existingProduct.price}/kg.`
          : `❌ '${productName}' not found.`;
      }

      // ✅ 2. Order Management
      case "order_place": {
        return jsonResponse.response.message || "✅ Order placed successfully.";
    }
    case "search_products": {
      const products = jsonResponse.response.results;
      if (!products || products.length === 0) {
          return "❌ No products found.";
      }
  
      const productList = products
          .map(p => `🛒 ${p.name}: ₹${p.price}/unit, Available: ${p.quantity}`)
          .join("\n");
  
      return `🔍 Search Results:\n${productList}`;
  }
  

      case "cancel_order": {
        if (orders.length === 0) return "❌ No order specified.";
        const { orderId } = orders[0];

        const order = await Order.findById(orderId);
        if (!order || order.sellerId !== userId) {
          return "❌ Order not found.";
        }

        order.status = "Cancelled";
        await order.save();
        return `🚫 Order '${orderId}' cancelled.`;
      }

      case "track_order": {
        if (orders.length === 0) return "❌ No order specified.";
        const { orderId } = orders[0];

        const order = await Order.findById(orderId);
        return order ? `📦 Order '${orderId}' status: ${order.status}.` : "❌ Order not found.";
      }

      // ✅ 3. General Chat
      case "greet":
        return "👋 Hello! How can I assist you today?";
      
      case "goodbye":
        return "👋 Goodbye! Have a great day!";
      
      case "fallback":
        return "🤖 Sorry, I didn't understand that.";

      default:
        return "🤖 I'm not sure how to help with that.";
    }
  } catch (error) {
    console.error(`❌ FastAPI Model Error: ${error.message}`);
    return "🚨 An error occurred.";
  }
};

// Middleware to authenticate and attach user to socket
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error("Authentication error"));
      socket.user = decoded;
      next();
    });
  } else {
    next(new Error("Authentication error"));
  }
});

// WebSocket Chatbot Flow: Frontend → Node.js → FastAPI → Node.js → Frontend
io.on("connection", (socket) => {
  console.log(`🔗 User connected with ID: ${socket.id}`);

  socket.on("userMessage", async (data) => {
    console.log(`📩 Received message from user: ${data.message}`);
    
    // Send user message to FastAPI
    const botReply = await runFastAPIModel(data.message.toLowerCase(), socket.user.id);

    // Send response back to frontend
    socket.emit("botMessage", { message: botReply });
  });

  socket.on("disconnect", () => {
    console.log(`❌ User Disconnected: ${socket.id}`);
  });
});

// Start Server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
