const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Server } = require("socket.io");
const fetch = require("node-fetch");

require("dotenv").config();

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

// MongoDB Schemas
const User = mongoose.model("User", new mongoose.Schema({
  firstname: String,
  lastname: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  phonenumber: String,
  userType: { type: String, enum: ["customer", "farmer"], required: true },
}));

const Product = mongoose.model("Product", new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: String, required: true },
  quantity: { type: String, required: true },
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
}));

const Order = mongoose.model("Order", new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  quantity: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  status: { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now },
}));

// Function to Call FastAPI Model and Update MongoDB
const runFastAPIModel = async (message, userId) => {
  try {
    console.log(`📡 Sending message to FastAPI model: ${message} for user: ${userId}`);

    const response = await fetch("http://127.0.0.1:8080/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message, userId: userId }),
    });

    if (!response.ok) {
      throw new Error(`FastAPI Model Error: ${response.statusText}`);
    }

    const jsonResponse = await response.json();
    console.log(`🤖 FastAPI Response: ${JSON.stringify(jsonResponse)}`);

    const { intent, entities } = jsonResponse.response;

    if (intent === "add_product" || intent === "update_product") {
      const { name, price, quantity, unit } = entities;
      const productName = name.toLowerCase();

      // Parse quantity and price
      const parsedQuantity = parseFloat(quantity);
      const parsedPrice = parseFloat(price);

      if (isNaN(parsedQuantity) || isNaN(parsedPrice)) {
        throw new Error("Invalid quantity or price format");
      }

      const existingProduct = await Product.findOne({ name: productName, farmerId: userId });

      if (existingProduct) {
        existingProduct.price = parsedPrice;
        existingProduct.quantity = parsedQuantity;
        await existingProduct.save();
        return `🔄 Updated '${productName}' for farmer ${userId}.`;
      } else {
        const newProduct = new Product({
          name: productName,
          price: parsedPrice,
          quantity: parsedQuantity,
          farmerId: userId,
        });
        await newProduct.save();
        return `✅ Product '${productName}' added successfully for farmer ${userId}.`;
      }
    } else if (intent === "check_availability") {
      const { name } = entities;
      const productName = name.toLowerCase();

      const existingProduct = await Product.findOne({ name: productName, farmerId: userId });

      if (existingProduct) {
        return `✅ '${productName}' is available: ${existingProduct.quantity} kg at ₹${existingProduct.price}/kg.`;
      } else {
        return `❌ '${productName}' not found for farmer ${userId}.`;
      }
    } else if (intent === "view_listings") {
      const products = await Product.find({ farmerId: userId });
      const listings = products.map(product => ({
        name: product.name,
        quantity: product.quantity,
        price: product.price
      }));
      return listings;
    }

    return "🤖 Unable to process request.";
  } catch (error) {
    console.error(`❌ FastAPI Model Error: ${error.message}`);
    return "unknown";
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

// User Registration
app.post("/auth/register", async (req, res) => {
  try {
    const { firstname, lastname, email, password, phonenumber, userType } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ firstname, lastname, email, password: hashedPassword, phonenumber, userType });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id, userType }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Registration successful!", data: { token, user: newUser } });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// User Login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password, userType } = req.body;
    const user = await User.findOne({ email, userType });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, userType }, process.env.JWT_SECRET, { expiresIn: "1h" });
    console.log(`🔑 Generated Token: ${token}`); // Display the token in the console
    res.json({ message: "Login successful!", data: { token, user } });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Start Server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));