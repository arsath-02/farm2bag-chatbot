import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

const router = express.Router();

// User Registration
router.post("/register", async (req, res) => {
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
router.post("/login", async (req, res) => {
  try {
    const { email, password, userType } = req.body;
    const user = await User.findOne({ email, userType });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, userType }, process.env.JWT_SECRET, { expiresIn: "1h" });
    console.log(`🔑 Generated Token: ${token}`); 
    res.json({ message: "Login successful!", data: { token, user } });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

export default router;