import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

// Define WebSocket Server URL
const SOCKET_SERVER_URL = "http://localhost:8080";

const Chat = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [userType, setUserType] = useState("");
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const token = localStorage.getItem("token");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Retrieve user role from localStorage
    const storedUserType = localStorage.getItem("userRole");
    if (!storedUserType) {
      alert("User type not found. Please log in again.");
      return;
    }
    setUserType(storedUserType);

    // Establish WebSocket connection
    const newSocket = io(SOCKET_SERVER_URL, { query: { token } });

    // Handle incoming messages
    newSocket.on("botMessage", (data) => {
      setIsTyping(false);
      setMessages((prev) => [...prev, { sender: "Bot", message: data.message }]);
    });

    newSocket.on("receiveMessage", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  useEffect(() => {
    // Auto-scroll to latest message
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (message.trim() === "" || !socket) return;
    
    setMessages((prev) => [...prev, { sender: "You", message }]);
    setIsTyping(true);
    socket.emit("userMessage", { message });

    setMessage("");
  };

  return (
    <div className="p-4 bg-gray-100 h-screen flex flex-col justify-center items-center">
      <h2 className="text-xl font-bold text-center mb-4 text-green-600">
        {userType === "farmer" ? "🌾 Farmer's Chat" : "🛒 Customer Chat"}
      </h2>
      
      <div className="border p-2 h-64 w-96 overflow-auto bg-white rounded-md shadow-md text-gray-600">
        {messages.map((msg, index) => (
          <p key={index} className={`p-2 rounded-md text-sm ${msg.sender === "You" ? "bg-green-300 text-right" : "bg-gray-200"}`}>
            <strong>{msg.sender}:</strong> {msg.message}
          </p>
        ))}
        
        {isTyping && <p className="text-gray-400 text-sm italic">Bot is typing...</p>}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="w-96 mt-2 flex">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="border p-2 flex-grow rounded-md shadow-sm text-gray-600"
          placeholder="Type a message..."
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} className="ml-2 bg-green-500 text-white p-2 rounded-md shadow-md">
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
