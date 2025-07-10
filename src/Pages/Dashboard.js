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
import homeIcon from "../assets/home.svg";
import savedIcon from "../assets/bookmark.svg";
import { 

  Brightness7 as LightIcon,
  Brightness4 as DarkIcon
} from "@mui/icons-material";

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const displayName = user?.username || "Guest";
  const photoURL = `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`;
  
  // States
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [hoveredChatId, setHoveredChatId] = useState(null);
  const [editChatId, setEditChatId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [theme, setTheme] = useState("light");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    // Fetch models
    axios.get("http://localhost:8000/api/get_models", { withCredentials: true })
      .then(res => {
        const modelList = res.data.response[0] || [];
        setModels(modelList);
        if (modelList.length > 0) setSelectedModel(modelList[0]);
      })
      .catch(err => console.error("Error fetching models:", err));

    // Fetch chat history
    axios.get("http://localhost:8000/api/list_chats", { withCredentials: true })
      .then(res => setChatHistory(res.data.chats || []))
      .catch(err => console.error("Error loading chat history:", err));
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
    setEditTitle(""); // ✅ clear editTitle after renaming
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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar toggle */}
      <button 
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-indigo-600 text-white"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰
      </button>

      {/* Sidebar */}
      <div className={`fixed md:relative z-30 h-full w-[270px] overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-white transform transition-transform duration-300
  ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

        
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <img src={gptLogo} alt="Logo" className="w-8 h-8" />
              <span className="text-xl font-bold">DevBot</span>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Model Selector */}
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {selectedModel === "" && (
                  <option value="" disabled hidden>Select Model</option>
                )}
                {models.map((model, idx) => (
                  <option key={idx} value={model}>{model}</option>
                ))}
              </select>
              
              {/* New Chat Button */}
              <button 
                onClick={handleNewChat}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
              >
                New Chat
              </button>
              
              {/* Chat History */}
              <div className="mt-6">
                <h2 className="text-lg font-semibold mb-3">Conversation History</h2>
                <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                  {chatHistory.length === 0 ? (
                    <p className="text-gray-400 text-sm">No messages yet</p>
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
                        className={`relative p-2 rounded-md cursor-pointer flex justify-between items-center ${
                          selectedChatId === conv.id 
                            ? "bg-indigo-600" 
                            : "hover:bg-gray-700"
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
                            className="w-full bg-transparent border-b border-white outline-none"
                          />
                        ) : (
                          <div 
                            className="truncate flex-1"
                            onClick={() => {
                              setSelectedChatId(conv.id);
                              setSidebarOpen(false);
                            }}
                          >
                            {conv.title || `Conversation ${index + 1}`}
                          </div>
                        )}
                        
                        {hoveredChatId === conv.id && (
                          <div className="flex">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(menuOpenId === conv.id ? null : conv.id);
                              }}
                              className="p-1 rounded hover:bg-gray-600"
                            >
                              <MoreVertIcon className="text-sm" />
                            </button>
                            
                            {menuOpenId === conv.id && (
                              <div className="absolute right-0 top-8 mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-10 w-32">
                                <button
                                  onClick={() => {
                                    setEditChatId(conv.id);
                                    setEditTitle(conv.title);
                                    setMenuOpenId(null);
                                  }}
                                  className="flex w-full items-center px-3 py-2 hover:bg-gray-700"
                                >
                                  <EditIcon className="mr-2 text-sm" /> Rename
                                </button>
                                <button
                                  onClick={() => handleDeleteChat(conv.id)}
                                  className="flex w-full items-center px-3 py-2 hover:bg-gray-700"
                                >
                                  <DeleteIcon className="mr-2 text-sm" /> Delete
                                </button>
                                <button
                                  onClick={() => handleShare(conv.id)}
                                  className="flex w-full items-center px-3 py-2 hover:bg-gray-700"
                                >
                                  <ShareIcon className="mr-2 text-sm" /> Share
                                </button>
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
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-gray-700">
            <div className="space-y-2">
              {/* <button className="flex items-center w-full p-2 rounded-md hover:bg-gray-700">
                <img src={homeIcon} alt="Home" className="w-5 h-5 mr-3" />
                Home
              </button>
              <button className="flex items-center w-full p-2 rounded-md hover:bg-gray-700">
                <img src={savedIcon} alt="Saved" className="w-5 h-5 mr-3" />
                Saved
              </button> */}
              <div className="flex items-center p-2 rounded-md hover:bg-gray-700">
                <img 
                  src={photoURL} 
                  alt="User" 
                  className="w-8 h-8 rounded-full mr-3" 
                />
                <span className="truncate">{displayName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
          <div className="flex items-center">
            {!sidebarOpen && (
              <button 
                className="md:hidden mr-3 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => setSidebarOpen(true)}
              >
                ☰
              </button>
            )}
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {chatHistory.find(chat => chat.id === selectedChatId)?.title || "New Chat"}
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="p-2 rounded-lg hover:bg-gray-200 text-gray-900 dark:text-white dark:hover:bg-gray-700"
              >
                {theme === "light" ? <DarkIcon /> : <LightIcon />}
              </button>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
            >
              <LogoutIcon className="mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
        
        {/* Chat Area */}
        <div className="flex-1 p-20 overflow-hidden">
          <Chat
            selectedModel={selectedModel}
            setChatHistory={setChatHistory}
            selectedChatId={selectedChatId}
            setSelectedChatId={setSelectedChatId}
          />
        </div>
      </div>
    </div>
  );
};
export default Dashboard;