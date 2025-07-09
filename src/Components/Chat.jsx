import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import gptImgLogo from "../assets/chatgptLogo.svg";
import userIcon from "../assets/user-icon.png";

const Chat = ({ selectedModel, setChatHistory }) => {
  const [typedValue, setTypedValue] = useState("");
  const [messageData, setMessageData] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageData, loading]);

  const handleSubmit = async () => {
    if (!typedValue.trim() || !selectedModel) return;

    const userMessage = { type: "Sender", message: typedValue };
    setMessageData((prev) => [...prev, userMessage]);
    setTypedValue("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:3001/chat", {
        model: selectedModel,
        messages: [
          ...messageData.map((m) => ({
            role: m.type === "Sender" ? "user" : "assistant",
            content: m.message,
          })),
          { role: "user", content: typedValue },
        ],
      });

      const reply = {
        type: "Receiver",
        message: res.data.message.content || "No reply.",
      };

      setMessageData((prev) => [...prev, reply]);

      setChatHistory((prev) => [
        ...prev,
        { user: typedValue, bot: reply.message },
      ]);
    } catch (err) {
      const errorMessage = "⚠️ Error getting response.";
      setMessageData((prev) => [
        ...prev,
        { type: "Receiver", message: errorMessage },
      ]);
      setChatHistory((prev) => [
        ...prev,
        { user: typedValue, bot: errorMessage },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable chat messages */}
      <div
        className="flex-1 overflow-y-auto p-4 scrollbar-hide"
        style={{ maxHeight: "calc(100vh - 130px)" }}
      >
        {messageData.map((msg, idx) => (
          <div
            className={`chat ${msg.type === "Sender" ? "sender" : "bot"}`}
            key={idx}
          >
            <img
              className="chatimg"
              src={msg.type === "Sender" ? userIcon : gptImgLogo}
              alt=""
            />
            <p className="txt text-[14px]">{msg.message}</p>
          </div>
        ))}

        {loading && (
          <div className="chat bot loading">
            <img className="chatimg" src={gptImgLogo} alt="" />
            <p className="txt">Thinking...</p>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Chat Input Footer */}
      <div className="chatFooter p-6">
        <div className="inp flex items-end">
          <textarea
            rows={1}
            className="resize-none w-full bg-transparent text-white outline-none max-h-40 overflow-y-auto scrollbar-hide"
            placeholder="Send a message..."
            value={typedValue}
            onChange={(e) => {
              setTypedValue(e.target.value);
              const textarea = e.target;
              textarea.style.height = "auto";
              textarea.style.height =
                Math.min(textarea.scrollHeight, 160) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <button className="send p-5" onClick={handleSubmit}>
            <span>➤</span>
          </button>
        </div>
        {/* <p className="text-xs text-gray-400 mt-1">
          ChatBot may produce incorrect information about the query being asked.
        </p> */}
      </div>
    </div>
  );
};

export default Chat;
