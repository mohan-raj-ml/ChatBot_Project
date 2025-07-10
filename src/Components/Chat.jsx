import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import gptImgLogo from "../assets/chatgptLogo.svg";
import { Mic, Paperclip, Send } from "lucide-react";

const Chat = ({
  selectedModel,
  setChatHistory,
  selectedChatId,
  setSelectedChatId,
}) => {
  const [typedValue, setTypedValue] = useState("");
  const [messageData, setMessageData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
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
    setHasStarted(true);
    setLoading(true);

    try {
      let currentChatId = selectedChatId;

      // Create chat if needed
      if (!currentChatId) {
        const chatRes = await axios.post(
          "http://localhost:8000/api/create_chat",
          { title: "New Chat" }, // Initial dummy title
          { withCredentials: true }
        );
        currentChatId = chatRes.data.chat_id;
        setSelectedChatId(currentChatId);
      }

      // Send prompt
      await axios.post(
        "http://localhost:8000/api/respond",
        {
          prompt: typedValue,
          model: selectedModel,
          chat_id: currentChatId,
        },
        { withCredentials: true }
      );

      // Fetch updated history
      const res2 = await axios.get(
        `http://localhost:8000/api/chat_history?chat_id=${currentChatId}`,
        { withCredentials: true }
      );
      const formatted2 = res2.data.map((m) => ({
        type: m.role === "user" ? "Sender" : "Receiver",
        message: m.content,
      }));
      setMessageData(formatted2);

      // Refresh sidebar chat list
      const refreshed = await axios.get("http://localhost:8000/api/list_chats", {
        withCredentials: true,
      });
      setChatHistory(refreshed.data.chats || []);
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
      <div className="flex-1 overflow-y-auto scrollbar-none p-4 space-y-6">
        {!hasStarted && messageData.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="bg-gray-200 dark:bg-gray-700 border-2 border-dashed border-gray-400 dark:border-white rounded-xl w-16 h-16 mb-4" />
            <h3 className="text-lg font-medium">Start a conversation</h3>
            <p className="text-center max-w-md mt-2">
              Ask questions, get answers, and explore with DevBot. Type your message below to get started.
            </p>
          </div>
        )}

        {messageData.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.type === "Sender" ? "justify-end" : "justify-start"}`}
          >
            {msg.type === "Sender" ? (
              <div className="flex items-start justify-end max-w-[85%]">
                <img
                  src={userAvatar}
                  alt="User"
                  className="w-8 h-8 rounded-full ml-2 order-2"
                />
                <div className="prose dark:prose-invert text-gray-900 dark:text-white max-w-none text-right bg-indigo-100 dark:bg-gray-700 p-3 rounded-lg text-base">
                  <ReactMarkdown>{msg.message}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-end max-w-[85%]">
                <img
                  src={gptImgLogo}
                  alt="Bot"
                  className="w-8 h-8 rounded-full mr-2"
                />
                <div className="prose dark:prose-invert text-gray-900 dark:text-white max-w-none text-left bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-base">
                  <ReactMarkdown>{msg.message}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-end">
            <img
              src={gptImgLogo}
              alt="Bot"
              className="w-8 h-8 rounded-full mr-2"
            />
            <div className="bg-gray-200 dark:bg-gray-700 rounded-r-xl rounded-tl-xl px-4 py-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-black dark:border-gray-700">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
            <button className="p-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <Paperclip size={16} />
            </button>

            <textarea
              rows={1}
              className="flex-1 resize-none py-3 px-1 bg-transparent outline-none max-h-32 text-base text-gray-900 dark:text-white"
              placeholder="Send a message..."
              value={typedValue}
              onChange={(e) => {
                setTypedValue(e.target.value);
                setHasStarted(true);
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

            <div className="flex p-2">
              {typedValue ? (
                <button
                  onClick={handleSubmit}
                  className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700"
                >
                  <Send size={14} />
                </button>
              ) : (
                <button className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <Mic size={16} />
                </button>
              )}
            </div>
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">
            DevBot can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chat;
