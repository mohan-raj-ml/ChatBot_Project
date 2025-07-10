import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import gptImgLogo from "../assets/chatgptLogo.svg";
import { Mic, Paperclip } from "lucide-react"; 

const Chat = ({
  selectedModel,
  setChatHistory,
  selectedChatId,
  setSelectedChatId,
}) => {
  const [typedValue, setTypedValue] = useState("");
  const [messageData, setMessageData] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const username = user?.username || "Guest";
  const userAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${username}`;

  useEffect(() => {
    const timeout = setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => clearTimeout(timeout);
  }, [messageData, loading]);

  useEffect(() => {
    const loadChatHistory = async () => {
      if (!selectedChatId) return;
      try {
        const res = await axios.get(
          `http://localhost:8000/api/chat_history?chat_id=${selectedChatId}`,
          { withCredentials: true }
        );
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
          "http://localhost:8000/api/create_chat",
          { title: typedValue.slice(0, 50) },
          { withCredentials: true }
        );
        currentChatId = chatRes.data.chat_id;
        setSelectedChatId(currentChatId);

        const updatedHistory = await axios.get(
          "http://localhost:8000/api/list_chats",
          { withCredentials: true }
        );
        setChatHistory(updatedHistory.data.chats || []);
      }

      await axios.post(
        "http://localhost:8000/api/respond",
        {
          prompt: typedValue,
          model: selectedModel,
          chat_id: currentChatId,
        },
        { withCredentials: true }
      );

      const res2 = await axios.get(
        `http://localhost:8000/api/chat_history?chat_id=${currentChatId}`,
        { withCredentials: true }
      );
      const formatted2 = res2.data.map((m) => ({
        type: m.role === "user" ? "Sender" : "Receiver",
        message: m.content,
      }));

      if (messageData.length === 1 && messageData[0].type === "Sender") {
        setMessageData([
          messageData[0],
          ...formatted2.filter((m) => m.type === "Receiver"),
        ]);
      } else {
        setMessageData(formatted2);
      }
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
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide" style={{ maxHeight: "calc(100vh - 140px)" }}>
        {messageData.map((msg, idx) => (
          <div
            key={idx}
            className={`chat flex items-start mb-3 text-[14px] ${
              msg.type === "Sender" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.type === "Sender" ? (
              <>
                <div className="bg-blue-950 text-white rounded px-4 py-2 max-w-[75%] break-words whitespace-pre-wrap">
                  {msg.message}
                </div>
                <img src={userAvatar} alt="User" className="w-8 h-8 ml-3 rounded" />
              </>
            ) : (
              <>
                <img src={gptImgLogo} alt="Bot" className="w-8 h-8 mr-3 rounded" />
                <div className="bg-gray-700 text-white rounded px-4 py-2 max-w-[75%] overflow-x-auto whitespace-pre-wrap break-words prose prose-invert">
                  <ReactMarkdown>{msg.message}</ReactMarkdown>
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

      <div className="chatFooter p-10 pb-20">
  <div className="inp flex items-end bg-[#1c1e3a] rounded px-3 py-2 w-full max-w-[68rem] mx-auto">
  
  {/* Attachment icon - smaller and spaced from textarea */}
  <button
    className="text-white mr-4 flex items-center justify-center"
    title="Attach file"
  >
    <Paperclip size={16} />
  </button>

  {/* Textarea */}
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

  {/* Mic + Send icons with 1 inch (approx. 16px) spacing */}
  <div className="flex items-center gap-4 ml-4">
    <button
      className="text-white flex items-center justify-center"
      title="Voice input"
    >
      <Mic size={16} />
    </button>
    <button
      className="send text-white text-xl"
      onClick={handleSubmit}
      title="Send"
    >
      ➤
    </button>
  </div>
</div>

</div>

    </div>
  );
};

export default Chat;
