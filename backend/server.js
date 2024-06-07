import express from "express"
import cors from "cors"
import { connectDB } from "./config/db.js"
import foodRouter from "./routes/foodRoute.js"



// app config

const app=express()
const port = 4000

// middleware

app.use(express.json()) //whenever we get request from frontend to backend that will be parsed using this json
app.use(cors()) //we can access the backend from any frontend

// db connection
connectDB();

// api endpoints
app.use("/api/food",foodRouter)

app.get("/",(req,res)=>{
    res.send("API Working")  

})

app.listen(port,()=>{
    console.log(`Server Started on http://localhost:${port}`)
})

//mongodb+srv://greatstack:33858627@cluster0.armi0ym.mongodb.net/?


//https://cloud.mongodb.com/v2/6661d5de052f7f6c03d5116a#/metrics/replicaSet/6661d64c86c6e63dd6c58a16/explorer/food-del/foods/find