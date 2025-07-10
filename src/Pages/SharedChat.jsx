import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import gptImgLogo from "../assets/chatgptLogo.svg";

const SharedChat = () => {
  const { chat_id } = useParams();
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchChat = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/api/chat_history`, {
          params: { chat_id },
          withCredentials: true, // remove this if sharing is public
        });
        const formatted = res.data.map((m) => ({
          type: m.role === "user" ? "Sender" : "Receiver",
          message: m.content,
        }));
        setMessages(formatted);
      } catch (err) {
        console.error("Error loading shared chat:", err);
        setError("⚠️ Unable to load shared chat.");
      }
    };

    fetchChat();
  }, [chat_id]);

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Shared Conversation</h1>
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start text-sm ${
                msg.type === "Sender" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.type === "Receiver" && (
                <img
                  src={gptImgLogo}
                  alt="Bot"
                  className="w-8 h-8 mr-2 rounded"
                />
              )}
              <div
                className={`px-4 py-2 rounded max-w-[70%] whitespace-pre-wrap break-words ${
                  msg.type === "Sender"
                    ? "bg-blue-900 text-white"
                    : "bg-gray-700 text-white"
                }`}
              >
                {msg.message}
              </div>
              {msg.type === "Sender" && (
                <img
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=Shared`}
                  alt="User"
                  className="w-8 h-8 ml-2 rounded"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SharedChat;
