import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Chat from "../Components/Chat";
import gptLogo from "../assets/chatgpt.svg";
import home from "../assets/home.svg";
import saved from "../assets/bookmark.svg";
import LogoutIcon from "@mui/icons-material/Logout";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ShareIcon from "@mui/icons-material/Share";
import SettingsIcon from "@mui/icons-material/Settings";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import Brightness4Icon from "@mui/icons-material/Brightness4";
const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const displayName = user?.username || "Guest";
  const photoURL = `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`;
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [hoveredChatId, setHoveredChatId] = useState(null);
  const [editChatId, setEditChatId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [showThemeOptions, setShowThemeOptions] = useState(false);
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  useEffect(() => {
    axios
      .get("http://localhost:8000/api/get_models", { withCredentials: true })
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
      .get("http://localhost:8000/api/list_chats", { withCredentials: true })
      .then((res) => {
        setChatHistory(res.data.chats || []);
      })
      .catch((err) => console.error("Error loading chat history:", err));
  }, []);
  const handleNewChat = async () => {
    try {
      const res = await axios.post(
        "http://localhost:8000/api/create_chat",
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
      await axios.post("http://localhost:8000/logout", {}, { withCredentials: true });
      localStorage.removeItem("user");
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };
  const handleDeleteChat = async (chatId) => {
    try {
      await axios.post("http://localhost:8000/api/delete_chat", null, {
        params: { chat_id: chatId },
        withCredentials: true,
      });
      setChatHistory((prev) => prev.filter((chat) => chat.id !== chatId));
      if (selectedChatId === chatId) setSelectedChatId(null);
    } catch (err) {
      console.error("Error deleting chat:", err);
    }
  };
  const handleRenameChat = async (chatId) => {
    try {
      await axios.post(
        "http://localhost:8000/api/rename_chat",
        { chat_id: chatId, new_title: editTitle },
        { withCredentials: true }
      );
      setChatHistory((prev) =>
        prev.map((chat) =>
          chat.id === chatId ? { ...chat, title: editTitle } : chat
        )
      );
      setEditChatId(null);
    } catch (err) {
      console.error("Rename failed:", err);
    }
  };
  const handleShare = (chatId) => {
    const shareUrl = `${window.location.origin}/share/${chatId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("Share link copied to clipboard!");
    });
  };
  return (
    <div className="App relative">
      <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowThemeOptions((prev) => !prev)}
            className="text-white border border-gray-600 rounded px-3 py-2 hover:bg-indigo-600 transition"
          >
            <SettingsIcon />
          </button>
          {showThemeOptions && (
            <div className="absolute right-0 mt-2 w-36 bg-white text-black shadow-md rounded-md text-sm z-50">
              <div
                className="flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100"
                onClick={() => setTheme("light")}
              >
                <Brightness7Icon fontSize="small" className="mr-2" /> Light Theme
              </div>
              <div
                className="flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100"
                onClick={() => setTheme("dark")}
              >
                <Brightness4Icon fontSize="small" className="mr-2" /> Dark Theme
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="listItems flex items-center bg-transparent text-white border border-gray-600 rounded px-4 py-2 hover:bg-indigo-600 transition"
        >
          <LogoutIcon className="mr-2" />
          Logout
        </button>
      </div>
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
            <h2 className="text-xl p-5 font-bold mb-2">Conversation History</h2>
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto scrollbar-hide">
              {chatHistory.length === 0 ? (
                <p className="text-sm text-gray-400">No messages yet</p>
              ) : (
                chatHistory.map((conv, index) => (
                  <div
                    key={conv.id}
                    onMouseEnter={() => setHoveredChatId(conv.id)}
                    onMouseLeave={() => {
                      setHoveredChatId(null);
                      setEditChatId(null);
                      setMenuOpenId(null);
                    }}
                    className={`relative text-lg p-2 rounded cursor-pointer ${
                      selectedChatId === conv.id ? "border border-white" : ""
                    }`}
                  >
                    {editChatId === conv.id ? (
                      <input
                        type="text"
                        value={editTitle}
                        autoFocus
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameChat(conv.id);
                          else if (e.key === "Escape") setEditChatId(null);
                        }}
                        className="bg-transparent border-b border-white outline-none text-white w-full"
                      />
                    ) : (
                      <div onClick={() => setSelectedChatId(conv.id)}>
                        {conv.title || `Conversation ${index + 1}`}
                      </div>
                    )}
                    {hoveredChatId === conv.id && (
                      <div className="absolute right-2 top-1">
                        <MoreVertIcon
                          onClick={() =>
                            setMenuOpenId(menuOpenId === conv.id ? null : conv.id)
                          }
                          className="text-white cursor-pointer"
                        />
                        {menuOpenId === conv.id && (
                          <div className="absolute right-0 mt-1 bg-white text-black shadow rounded z-10 text-sm w-32">
                            <div
                              onClick={() => {
                                setEditChatId(conv.id);
                                setEditTitle(conv.title);
                                setMenuOpenId(null);
                              }}
                              className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              <EditIcon fontSize="small" className="mr-2" />
                              Rename
                            </div>
                            <div
                              onClick={() => {
                                handleDeleteChat(conv.id);
                                setMenuOpenId(null);
                              }}
                              className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              <DeleteIcon fontSize="small" className="mr-2" />
                              Delete
                            </div>
                            <div
                              onClick={() => {
                                handleShare(conv.id);
                                setMenuOpenId(null);
                              }}
                              className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              <ShareIcon fontSize="small" className="mr-2" />
                              Share
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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