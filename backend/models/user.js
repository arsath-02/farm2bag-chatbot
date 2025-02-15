import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
    firstname: { type: String},
    lastname: { type: String },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    userType: { type: String, enum: ["customer", "farmer"], required: true },
    }); 

const User = mongoose.model("User", userSchema);
export default User;