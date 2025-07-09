import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import gptImgLogo from "../assets/chatgptLogo.svg";

const Chat = ({ selectedModel, setChatHistory, selectedChatId, setSelectedChatId }) => {
  const [typedValue, setTypedValue] = useState("");
  const [messageData, setMessageData] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const username = user?.username || "Guest";
  const userAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${username}`;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageData, loading]);

  useEffect(() => {
    const loadChatHistory = async () => {
      if (!selectedChatId) return;
      try {
        const res = await axios.get(`http://localhost:5000/api/chat_history?chat_id=${selectedChatId}`, {
          withCredentials: true,
        });
        const formatted = res.data.map((m) => ({
          type: m.role === "user" ? "Sender" : "Receiver",
          message: m.content,
        }));
        setMessageData(formatted);
      } catch (err) {
        console.error("Failed to load history:", err);
      }
    };

    loadChatHistory();
  }, [selectedChatId]);

  const handleSubmit = async () => {
    if (!typedValue.trim() || !selectedModel) return;
    const userMessage = { type: "Sender", message: typedValue };
    setMessageData((prev) => [...prev, userMessage]);
    setTypedValue("");
    setLoading(true);

    try {
      let currentChatId = selectedChatId;

      if (!currentChatId) {
        const chatRes = await axios.post(
          "http://localhost:5000/api/create_chat",
          { title: typedValue.slice(0, 50) },
          { withCredentials: true }
        );
        currentChatId = chatRes.data.chat_id;
        setSelectedChatId(currentChatId);
        setChatHistory((prev) => [
          ...prev,
          {
            id: currentChatId,
            title: chatRes.data.title,
            created_at: new Date().toISOString(),
          },
        ]);
      }

      const res = await axios.post(
        "http://localhost:5000/api/respond",
        {
          prompt: typedValue,
          model: selectedModel,
          chat_id: currentChatId,
        },
        { withCredentials: true }
      );

      const reply = {
        type: "Receiver",
        message: res.data.response || "No reply.",
      };

      setMessageData((prev) => [...prev, reply]);
    } catch (err) {
      const errorMessage = "⚠️ Error getting response.";
      setMessageData((prev) => [
        ...prev,
        { type: "Receiver", message: errorMessage },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex-1 overflow-y-auto p-4 scrollbar-hide"
        style={{ maxHeight: "calc(100vh - 130px)" }}
      >
        {messageData.map((msg, idx) => (
          <div
            key={idx}
            className={`chat flex items-start mb-3 text-[14px] ${
              msg.type === "Sender" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.type === "Sender" ? (
              <>
                <div className="bg-blue-950 text-white rounded px-4 py-2 max-w-[75%] break-words">
                  {msg.message}
                </div>
                <img
                  src={userAvatar}
                  alt="User"
                  className="w-8 h-8 ml-3 rounded"
                />
              </>
            ) : (
              <>
                <img
                  src={gptImgLogo}
                  alt="Bot"
                  className="w-8 h-8 mr-3 rounded"
                />
                <div className="bg-gray-700 text-white rounded px-4 py-2 max-w-[75%] break-words">
                  {msg.message}
                </div>
              </>
            )}
          </div>
        ))}

        {loading && (
          <div className="chat flex items-start text-[14px]">
            <img src={gptImgLogo} alt="Bot" className="w-8 h-8 mr-3 rounded" />
            <div className="bg-gray-700 text-white rounded px-4 py-2 max-w-[75%]">
              Thinking...
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="chatFooter p-4">
        <div className="inp flex items-end bg-[#1c1e3a] rounded px-3 py-2 w-full max-w-[68rem]">
          <textarea
            rows={1}
            className="resize-none w-full bg-transparent text-white outline-none max-h-40 text-sm overflow-y-auto scrollbar-hide"
            placeholder="Send a message..."
            value={typedValue}
            onChange={(e) => {
              setTypedValue(e.target.value);
              const textarea = e.target;
              textarea.style.height = "auto";
              textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <button className="send text-white text-xl ml-2" onClick={handleSubmit}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
