import React, { useEffect, useState } from "react";
import axios from "axios";
import Chat from "../Components/Chat";
import gptLogo from "../assets/chatgpt.svg";
import StorageIcon from "@mui/icons-material/Storage";
import home from "../assets/home.svg";
import saved from "../assets/bookmark.svg";
import rocket from "../assets/rocket.svg";
import CloseIcon from "@mui/icons-material/Close";

const Dashboard = () => {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [clicked, setClicked] = useState("demo");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const displayName = "John Doe";
  const photoURL = "https://api.dicebear.com/7.x/initials/svg?seed=JD";

  useEffect(() => {
    axios.get("http://localhost:3001/models")
      .then(res => {
        setModels(res.data);
        if (res.data.length > 0) {
          setSelectedModel(res.data[0]);
        }
      })
      .catch(err => {
        console.error("Error fetching models:", err);
        setModels([]);
      });
  }, []);

  return (
    <div className="App">
      {/* ---------- SIDEBAR ---------- */}
      <div className="sideBar">
        <div className="upperSide">
          <div className="upperSideTop">
            <img src={gptLogo} alt="Logo" className="logo" />
            <span className="brand">Chat Bot</span>
          </div>

          {/* Model Dropdown replaces Add DB */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="midBtn"
          >
            {models.map((model, idx) => (
              <option key={idx} value={model}>
                {model}
              </option>
            ))}
          </select>

          <div className="upperSideBottom">
            <button
              className={`query ${clicked === "demo" ? "bg-blue-900" : ""}`}
              onClick={() => setClicked("demo")}
            >
              <StorageIcon sx={{ fontSize: 20 }} />
              <h1 className="text-[14px] pl-5">Demo DB</h1>
            </button>
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
            <img src={rocket} alt="Upgrade" className="listitemsImg" />
            Upgrade to Pro
          </div>
          <button onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <div className="listItems">
              <img
                src={photoURL}
                alt="User"
                className="w-20 h-20 rounded-full cursor-pointer p-2 mr-3"
              />
              {displayName}
            </div>
          </button>

          {isDropdownOpen && (
            <div className="z-20 absolute shadow-lg bg-indigo-50 rounded-lg w-[250px]">
              <div className="text-end p-1 pr-2">
                <button onClick={() => setIsDropdownOpen(false)}>
                  <CloseIcon sx={{ color: "black" }} />
                </button>
              </div>
              <div className="py-1 text-lg text-black">
                <a href="#" className="block px-4 py-2 hover:bg-indigo-200">
                  Sign out
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- MAIN ---------- */}
      <div className="main">
        <Chat selectedModel={selectedModel} />
      </div>
    </div>
  );
};

export default Dashboard;
