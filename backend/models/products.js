import mongoose from "mongoose";
const productsSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: String, required: true },
    quantity: { type: Number, required: true },
    category : { type: String, default: "General" },    
    unit : { type: String, default: "kg" },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    location: { type: String },
    reviews: { type: Number },
    harvestDate: { type: Date,  default: Date.now},
    createdAt: { type: Date, default: Date.now },
    availability: {  type: String, default: "In Stock" },
    });

const Products = mongoose.model("Products", productsSchema);
export default Products;