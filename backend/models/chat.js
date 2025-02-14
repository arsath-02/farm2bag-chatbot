import e from "express";
import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, required: true }, 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    isBot: { type: Boolean, default: false } 
});

export default mongoose.model("Chat", chatSchema);
