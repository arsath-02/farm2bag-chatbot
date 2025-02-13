import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import "./Chat.css"; // Import the CSS file

const SOCKET_SERVER_URL = "http://localhost:8080";

const Chat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { sender: "Bot", message: "Hi! How can I assist you today? 😊" }, // Initial message
  ]);
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
    <div>
      <button className="chat-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "Close Chat" : "Chat"}
      </button>

      {isOpen && (
        <div className="chat-container open">
          <div className="chat-header">
            {userType === "farmer" ? "🌾 Farmer's Chat" : "🛒 Customer Chat"}
          </div>
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender === "You" ? "user-message" : "bot-message"}`}>
                <strong>{msg.sender}:</strong> {msg.message}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
