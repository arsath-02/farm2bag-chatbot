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

    const response = await fetch("http://127.0.0.1:8080/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, userId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FastAPI Model Error: ${response.statusText} - ${errorText}`);
    }

    const jsonResponse = await response.json();
    console.log(`🤖 FastAPI Response: ${JSON.stringify(jsonResponse)}`);

    const { intent, entities } = jsonResponse.response;
    const products = entities?.products ? [entities.products] : [];
    const orders = entities?.orders ? [entities.orders] : [];

    switch (intent) {
      // ✅ 1. Product Management
      case "add_product":
      case "update_product": {
        if (products.length === 0) return "❌ No product details provided.";
        
        const { name, price, quantity } = products[0];
        if (!name || isNaN(parseFloat(price)) || isNaN(parseFloat(quantity))) {
          return "❌ Invalid product details.";
        }

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
      case "place_order": {
        if (orders.length === 0) return "❌ No order details provided.";
        
        const { product_name, quantity, buyerId } = orders[0];
        const productName = product_name.toLowerCase();
        const parsedQuantity = parseFloat(quantity);

        const product = await Product.findOne({ name: productName });
        if (!product || product.quantity < parsedQuantity) {
          return `❌ Not enough stock for '${productName}'.`;
        }

        product.quantity -= parsedQuantity;
        await product.save();

        const newOrder = new Order({
          productName,
          quantity: parsedQuantity,
          buyerId,
          sellerId: userId,
          status: "Placed",
        });

        await newOrder.save();
        return `🛒 Order placed: ${parsedQuantity}kg of '${productName}'.`;
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
// WebSocket Chatbot Flow: Frontend → Node.js → FastAPI → Node.js → Frontend
io.on("connection", (socket) => {
  console.log(`🔗 User connected with ID: ${socket.id}`);

  socket.on("userMessage", async (data) => {
    console.log(`📩 Received message from user: ${data.message}`);
    
    // Send user message to FastAPI
    const botReply = await runFastAPIModel(data.message.toLowerCase(), socket.user.id);

    // Check if botReply is a valid response
    if (botReply) {
      // Send response back to frontend
      socket.emit("botMessage", { message: botReply });
    } else {
      // Send fallback message if botReply is not valid
      socket.emit("botMessage", { message: "🤖 I'm not sure how to help with that." });
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ User Disconnected: ${socket.id}`);
  });
});

// Start Server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));