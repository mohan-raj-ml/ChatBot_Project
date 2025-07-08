import React, { useState } from "react";
import axios from "axios";
import gptImgLogo from "../assets/chatgptLogo.svg";
import userIcon from "../assets/user-icon.png";

const Chat = ({ selectedModel }) => {
  const [typedValue, setTypedValue] = useState("");
  const [messageData, setMessageData] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!typedValue.trim() || !selectedModel) return;

    const userMessage = { type: "Sender", message: typedValue };
    setMessageData(prev => [...prev, userMessage]);
    setTypedValue("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:3001/chat", {
        model: selectedModel,
        messages: [...messageData.map(m => ({
          role: m.type === "Sender" ? "user" : "assistant",
          content: m.message
        })), { role: "user", content: typedValue }]
      });

      const reply = {
        type: "Receiver",
        message: res.data.message.content || "No reply."
      };

      setMessageData(prev => [...prev, reply]);
    } catch (err) {
      setMessageData(prev => [
        ...prev,
        { type: "Receiver", message: "⚠️ Error getting response." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="chats">
        {messageData.map((msg, idx) => (
          <div className={`chat ${msg.type === "Sender" ? "sender" : "bot"}`} key={idx}>
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
      </div>

      <div className="chatFooter">
        <div className="inp">
          <input
            type="text"
            placeholder="Send a message..."
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
          <button className="send p-5" onClick={handleSubmit}>
            <span>➤</span>
          </button>
        </div>
        <p>ChatBot may produce incorrect information about the query being asked.</p>
      </div>
    </>
  );
};

export default Chat;
