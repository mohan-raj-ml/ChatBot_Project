import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Chat from "../Components/Chat";
import gptLogo from "../assets/chatgpt.svg";
import home from "../assets/home.svg";
import saved from "../assets/bookmark.svg";
import LogoutIcon from "@mui/icons-material/Logout";

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const displayName = user?.username || "Guest";
  const photoURL = `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`;

  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/get_models", { withCredentials: true })
      .then((res) => {
        const modelList = res.data.response[0] || [];
        setModels(modelList);
        if (modelList.length > 0) setSelectedModel(modelList[0]);
      })
      .catch((err) => {
        console.error("Error fetching models:", err);
        setModels([]);
      });

    axios
      .get("http://localhost:5000/api/list_chats", { withCredentials: true })
      .then((res) => {
        setChatHistory(res.data.chats || []);
      })
      .catch((err) => console.error("Error loading chat history:", err));
  }, []);

  const handleNewChat = async () => {
    try {
      const res = await axios.post(
        "http://localhost:5000/api/create_chat",
        { title: "New Chat" },
        { withCredentials: true }
      );
      const newChat = {
        id: res.data.chat_id,
        title: res.data.title,
        created_at: new Date().toISOString(),
      };
      setChatHistory((prev) => [newChat, ...prev]);
      setSelectedChatId(newChat.id);
    } catch (err) {
      console.error("Failed to start new chat:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post("http://localhost:5000/logout", {}, { withCredentials: true });
      localStorage.removeItem("user");
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="App relative">
      {/* ---------- GLOBAL LOGOUT BUTTON ---------- */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={handleLogout}
          className="listItems flex items-center bg-transparent text-white border border-gray-600 rounded px-4 py-2 hover:bg-indigo-600 transition"
        >
          <LogoutIcon className="mr-2" />
          Logout
        </button>
      </div>

      {/* ---------- SIDEBAR ---------- */}
      <div className="sideBar">
        <div className="upperSide">
          <div className="upperSideTop">
            <img src={gptLogo} alt="Logo" className="logo" />
            <span className="brand">DevBot</span>
          </div>

          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="midBtn mb-2"
          >
            {selectedModel === "" && (
              <option value="" disabled hidden>
                Select Model
              </option>
            )}
            {models.map((model, idx) => (
              <option key={idx} value={model}>
                {model}
              </option>
            ))}
          </select>

          <button className="chat_bt mb-4" onClick={handleNewChat}>
            New chat
          </button>
          
          <div className="mt-16 px-2 text-white">
             <h2 className="text-xl p-5 font-bold mb-2 ">Conversation History</h2>
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto scrollbar-hide">
              {chatHistory.length === 0 ? (
              <p className="text-sm text-gray-400">No messages yet</p>
              ) : (
              chatHistory.map((conv, index) => (
             <div
            key={conv.id}
            onClick={() => setSelectedChatId(conv.id)}
            className={`text-lg p-2 rounded cursor-pointer ${
            selectedChatId === conv.id ? "border border-white" : ""
          }`}
          >
          {conv.title || `Conversation ${index + 1}`}
              </div>
            ))
            )}
        </div>
        </div>
        </div>

        <div className="lowerSide">
          <div className="listItems">
            <img src={home} alt="Home" className="listitemsImg" />
            Home
          </div>
          <div className="listItems">
            <img src={saved} alt="Saved" className="listitemsImg" />
            Saved
          </div>

          <div className="listItems">
            <img
              src={photoURL}
              alt="User"
              className="w-20 h-20 rounded-full cursor-pointer p-2 mr-3"
            />
            {displayName}
          </div>
        </div>
      </div>

      {/* ---------- MAIN ---------- */}
      <div className="main">
        <Chat
          selectedModel={selectedModel}
          setChatHistory={setChatHistory}
          selectedChatId={selectedChatId}
          setSelectedChatId={setSelectedChatId}
        />
      </div>
    </div>
  );
};

export default Dashboard;
