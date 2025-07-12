import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import BubbleChartIcon from "@mui/icons-material/BubbleChart"; // ✅ New Icon

const SharedChat = () => {
  const { chat_id } = useParams();
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchChat = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/shared_chat_history", {
          params: { chat_id },
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-white text-black">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <h1 className="text-2xl font-bold">Shared Conversation</h1>
      </div>

      {/* Chat Body */}
      <div className="flex-1 px-4 py-6 space-y-4 overflow-y-auto scrollbar-hide">
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-400">No messages in this conversation.</p>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start text-sm ${
                msg.type === "Sender" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.type === "Receiver" && (
                <div className="w-8 h-8 mr-2 text-black-500">
                  <BubbleChartIcon />
                </div>
              )}

              <div
                className={`prose break-words max-w-full text-black bg-gray-100 p-3 pr-10 rounded-lg text-base relative ${
                  msg.type === "Sender" ? "bg-blue-100" : "bg-gray-100"
                }`}
              >
                <ReactMarkdown>{msg.message}</ReactMarkdown>
              </div>

              {msg.type === "Sender" && (
                <img
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=Shared`}
                  alt="User"
                  className="w-8 h-8 ml-2 rounded"
                />
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default SharedChat;
