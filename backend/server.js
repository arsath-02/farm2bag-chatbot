require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Server } = require("socket.io");
const fetch = require("node-fetch");  // Ensure you have `node-fetch` installed

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
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
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

// Function to Call FastAPI Model
const runFastAPIModel = async (message) => {
  try {
    console.log(`📡 Sending message to FastAPI model: ${message}`);

    const response = await fetch("http://127.0.0.1:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      throw new Error(`FastAPI Model Error: ${response.statusText}`);
    }

    const jsonResponse = await response.json();
    console.log(`🤖 FastAPI Response: ${JSON.stringify(jsonResponse)}`);
    
    return jsonResponse.reply || "unknown";
  } catch (error) {
    console.error(`❌ FastAPI Model Error: ${error.message}`);
    return "unknown";
  }
};

// WebSocket Chatbot Flow: Frontend → Node.js → FastAPI → Node.js → Frontend
io.on("connection", (socket) => {
  console.log(`🔗 User connected with ID: ${socket.id}`);

  socket.on("userMessage", async (data) => {
    console.log(`📩 Received message from user: ${data.message}`);
    
    // Send user message to FastAPI
    const botReply = await runFastAPIModel(data.message.toLowerCase());

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
    res.json({ message: "Login successful!", data: { token, user } });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// WebSocket Chatbot
io.on("connection", (socket) => {
  const token = socket.handshake.query.token;
  if (!token) {
    console.log("❌ Unauthorized WebSocket connection: No token provided");
    socket.disconnect();
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    console.log(`🔗 User Connected: ${decoded.id} as ${decoded.userType}`);
    socket.emit("botMessage", { message: getWelcomeMessage(decoded.userType) });

    socket.on("userMessage", async (data) => {
      console.log(`📩 Received message: ${data.message}`);
      const { intent, entities } = await recognizeIntent(data.message.toLowerCase());
      console.log(`🧠 Recognized Intent: ${intent}, Entities: ${JSON.stringify(entities)}`);

      if (socket.user.userType === "farmer") {
        await handleFarmerProductActions(socket, intent, entities);
      } else {
        await handleBuyerProductQueries(socket, intent, entities);
      }
    });

    socket.on("disconnect", () => console.log(`❌ User Disconnected: ${decoded.id}`));
  } catch (error) {
    console.log(`❌ Invalid WebSocket token: ${error.message}`);
    socket.disconnect();
  }
});

// Dynamic Welcome Messages
const getWelcomeMessage = (userType) => {
  return userType === "farmer"
    ? "Hi! You can say:\n- 'I need to add product tomato 300kg for 70/kg'"
    : "Hi! You can say:\n- 'I need 2kg of onions'";
};



// ✅ Handle Farmer Product Actions
const handleFarmerProductActions = async (socket, intent, entities) => {
  console.log(`🛠️ Handling Farmer Intent: ${intent}`);
  console.log(`🔍 Extracted Entities: ${JSON.stringify(entities)}`);

  if (intent !== "add_product" || !entities.product || !entities.quantity || !entities.price) {
    console.log("❌ Invalid product details.");
    return socket.emit("botMessage", { message: "⚠️ Invalid product details. Try: 'I need to add product tomato 300kg for 70/kg'" });
  }

  try {
    const newProduct = new Product({
      name: entities.product,
      price: entities.price,
      quantity: entities.quantity,
      farmerId: socket.user.id
    });
    await newProduct.save();

    console.log(`✅ Product Saved: ${JSON.stringify(newProduct)}`);
    socket.emit("botMessage", { message: `✅ Product added: ${entities.product} - ${entities.quantity} kg at ₹${entities.price}/kg.` });
  } catch (error) {
    console.error(`❌ Error Saving Product: ${error.message}`);
    socket.emit("botMessage", { message: "❌ Failed to add product. Please try again later." });
  }
};

// Start Server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
