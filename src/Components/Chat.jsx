// Chat.jsx

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import gptImgLogo from "../assets/chatgptLogo.svg";
import { Mic, Paperclip, Send, Copy, Check, Square } from "lucide-react";
import { BubbleChart } from '@mui/icons-material';

const Chat = ({
  selectedModel,
  setChatHistory,
  selectedChatId,
  setSelectedChatId,
  disableInput
}) => {
  const [typedValue, setTypedValue] = useState("");
  const [messageData, setMessageData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [controller, setController] = useState(null);
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

  if (!selectedModel && messageData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p className="text-lg">Please select a model to begin chatting.</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!typedValue.trim()) return;
    if (!selectedModel) {
      alert("Please select a model to send messages.");
      return;
    }

    const userMessage = { type: "Sender", message: typedValue };
    setMessageData((prev) => [...prev, userMessage]);
    setTypedValue("");
    setHasStarted(true);
    setLoading(true);

    const abortController = new AbortController();
    setController(abortController);

    try {
      let currentChatId = selectedChatId;

      if (!currentChatId) {
        const chatRes = await axios.post(
          "http://localhost:8000/api/create_chat",
          { title: "New Chat" },
          { withCredentials: true }
        );
        currentChatId = chatRes.data.chat_id;
        setSelectedChatId(currentChatId);
      }

      const res = await axios.post(
        "http://localhost:8000/api/respond",
        {
          prompt: userMessage.message,
          model: selectedModel,
          chat_id: currentChatId,
        },
        {
          withCredentials: true,
          signal: abortController.signal,
        }
      );

      if (!abortController.signal.aborted && res.data.response?.trim()) {
        const assistantMessage = {
          type: "Receiver",
          message: res.data.response,
        };
        setMessageData((prev) => [...prev, assistantMessage]);
      }

      const refreshed = await axios.get("http://localhost:8000/api/list_chats", {
        withCredentials: true,
      });
      setChatHistory(refreshed.data.chats || []);
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log("Generation stopped.");
      } else {
        console.error("Error generating response:", err);
        setMessageData((prev) => [
          ...prev,
          { type: "Receiver", message: "⚠️ Error getting response." },
        ]);
      }
    } finally {
      setLoading(false);
      setController(null);
    }
  };

  const handleStop = () => {
    if (controller) {
      controller.abort();
      setController(null);
      setLoading(false);
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scrollbar-none p-4 space-y-6">
        {!hasStarted && messageData.length === 0 && selectedModel && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="bg-gray-200 dark:bg-gray-700 border-2 border-dashed border-gray-400 dark:border-white rounded-xl w-16 h-16 mb-4" />
            <h3 className="text-lg font-medium">Start a conversation</h3>
            <p className="text-center max-w-md mt-2">
              Ask questions, get answers, and explore with DevBot. Type your message below to get started.
            </p>
          </div>
        )}

        {messageData.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.type === "Sender" ? "justify-end" : "justify-start"}`}>
            <div className="flex items-start max-w-[85%] relative">
              {msg.type === "Sender" ? (
                <img
                  src={userAvatar}
                  alt={msg.type}
                  className="w-8 h-8 rounded-full ml-2 order-2"
                />
              ) : (
                <BubbleChart className="w-8 h-8 mr-2 text-black dark:text-white rounded-full" />
              )}
              <div
                className={`prose dark:prose-invert break-words max-w-full text-gray-900 dark:text-white pr-16 ${
                  msg.type === "Sender" ? "bg-indigo-100 dark:bg-gray-700" : "bg-gray-100 dark:bg-gray-800"
                } p-3 rounded-lg text-base relative`}
              >
                <ReactMarkdown>{msg.message}</ReactMarkdown>
                <div className="absolute top-1.5 right-1.5">
                  <button
                    className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    onClick={() => handleCopy(msg.message, idx)}
                    title="Copy message"
                  >
                    {copiedIndex === idx ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-end">
            <BubbleChart className="w-8 h-8 mr-2 text-black dark:text-white rounded-full" />
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

      {/* Input Box */}
      <div className="p-4 border-t border-black dark:border-gray-700">
        <div className="max-w-4xl mx-auto">
          <div className={`flex items-end rounded-lg border dark:border-gray-700 ${disableInput ? "bg-gray-200 dark:bg-gray-700 cursor-not-allowed" : "bg-white dark:bg-gray-800"}`}>
            <button className="p-3 text-gray-500" disabled>
              <Paperclip size={16} />
            </button>

            <textarea
              rows={1}
              className="custom-scrollbar flex-1 resize-none py-3 px-1 bg-transparent outline-none max-h-32 text-base text-gray-900 dark:text-white overflow-y-auto"
              placeholder={disableInput ? "Select a model to start typing..." : "Send a message..."}
              value={typedValue}
              disabled={disableInput}
              onChange={(e) => {
                if (disableInput) return;
                setTypedValue(e.target.value);
                setHasStarted(true);
                const textarea = e.target;
                textarea.style.height = "auto";
                textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
              }}
              onKeyDown={(e) => {
                if (disableInput) return;
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />

            <div className="flex p-2">
              {loading ? (
                <button
                  onClick={handleStop}
                  className="p-2 bg-gray-400 text-white rounded-full hover:bg-gray-500"
                  title="Stop"
                >
                  <Square size={14} />
                </button>
              ) : typedValue ? (
                <button
                  onClick={handleSubmit}
                  disabled={disableInput}
                  className={`p-2 rounded-full ${
                    disableInput
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                  title={disableInput ? "Select a model to send" : "Send"}
                >
                  <Send size={14} />
                </button>
              ) : (
                <button className="p-2 text-gray-500" disabled>
                  <Mic size={16} />
                </button>
              )}
            </div>
          </div>
          {disableInput && (
            <p className="text-center text-xs text-red-500 mt-2">
              Please select a model to send messages.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;