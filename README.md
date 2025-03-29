# 🌾 AI-Powered E-Commerce Chatbot for Farmers & Buyers

## 🚀 Overview

This project is a **WebSocket-based AI chatbot** designed to **simplify agricultural e-commerce** for farmers and buyers. Using **natural language processing (NLP) with DeepSeek**, the chatbot enables farmers to **list products, manage inventory, and negotiate prices**, while buyers can **search for products, place orders, and track deliveries** through a conversational interface.

## 📌 Features

✅ **Chat-based Product Management** – Farmers can list, update, and remove products using simple chat commands.
✅ **AI-Powered Order Placement** – Buyers can search for products and place orders using natural language queries.
✅ **Live WebSocket Communication** – Ensures real-time interaction between farmers, buyers, and the system.
✅ **Price Negotiation Support** – Allows flexible pricing and seamless discussions between sellers and buyers.
✅ **Multilingual Support** – Enables interaction in different languages for wider accessibility.
✅ **Seamless Backend Integration** – Uses **Node.js, FastAPI, MongoDB** for efficient data handling.

````

## 🛠️ Tech Stack
- **Frontend**: React (Vite), Tailwind CSS
- **Backend**: Node.js, FastAPI, WebSockets
- **Database**: MongoDB
- **AI/NLP**: DeepSeek fine-tuned model for intent recognition
- **Deployment**: Azure / AWS / GCP

## 📦 Installation
1️⃣ Clone the repository:
```bash
git clone https://github.com/arsath-02/farm2bag-chatbot.git
cd farm2bag-chatbot
````

2️⃣ Install backend dependencies:

```bash
cd backend
npm install
```

3️⃣ Install frontend dependencies:

```bash
cd ../frontend
npm install
```

4️⃣ Start the backend server:

```bash
cd backend
node server.js
```

5️⃣ Start the frontend:

```bash
cd frontend
npm run dev
```

## 🚀 Usage

- Farmers can add products using messages like:
  ```
  Add product mango 50kg for ₹30/kg
  ```
- Buyers can search and order products:
  ```
  I need 2kg of mango
  ```
- Chatbot automatically processes the request, fetches product details, and facilitates order placement.

## 🛠️ Troubleshooting

- **MongoDB Connection Issue**: Ensure your IP is whitelisted in MongoDB Atlas.
- **WebSocket Not Connecting**: Check if the server is running on the correct port.
- **NLP Not Responding**: Verify DeepSeek integration and API key setup.

## 🎯 Future Enhancements

- Implement **voice-based interaction** for accessibility.
- Add **order tracking & payment gateway integration**.
- Improve **recommendation system** based on past orders.

## 🏆 Contributing

Pull requests are welcome! Open an issue for feature suggestions or bug fixes.

## 📄 License

This project is licensed under the **MIT License**.

---

🚀 **Transforming agriculture with AI-powered e-commerce!** 🌱
