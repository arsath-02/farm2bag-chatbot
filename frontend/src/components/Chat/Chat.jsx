import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const SOCKET_SERVER_URL = "http://localhost:8080";

const Chat = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [userType, setUserType] = useState("");
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const storedUserType = localStorage.getItem("userRole");
    const token = localStorage.getItem("token");

    if (!storedUserType || !token) {
      alert("User type not found. Please log in again.");
      return;
    }

    setUserType(storedUserType);
    socketRef.current = io(SOCKET_SERVER_URL, { query: { token } });

    socketRef.current.on("botMessage", (data) => {
      setMessages((prev) => [...prev, { sender: "Bot", message: data.message }]);
    });

    return () => socketRef.current.disconnect();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (message.trim() === "") return;
    setMessages((prev) => [...prev, { sender: "You", message }]);
    socketRef.current.emit("userMessage", { message });
    setMessage("");
  };

  return (
    <div className="p-4 h-screen flex flex-col items-center">
      <h2 className="text-xl font-bold text-green-600">
        {userType === "farmer" ? "🌾 Farmer's Chat" : "🛒 Customer Chat"}
      </h2>
      
      <div className="border p-2 h-64 w-96 overflow-auto bg-white rounded-md text-gray-600">
        {messages.map((msg, index) => (
          <p key={index} className={`p-2 ${msg.sender === "You" ? "bg-green-300 text-right" : "bg-gray-200"}`}>
            <strong>{msg.sender}:</strong> {msg.message}
          </p>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="w-96 mt-2 flex">
        <input type="text" value={message} onChange={(e) => setMessage(e.target.value)}
          className="border p-2 flex-grow rounded-md" placeholder="Type a message..."
          onKeyPress={(e) => e.key === "Enter" && sendMessage()} />
        <button onClick={sendMessage} className="ml-2 bg-green-500 text-white p-2 rounded-md">Send</button>
      </div>
    </div>
  );
};

export default Chat;