import React, { useState, useEffect } from "react";
import gptLogo from "../assets/chatgpt.svg";
import addBtn from "../assets/add-30.png";
import msgIcon from "../assets/message.svg";
import home from "../assets/home.svg";
import saved from "../assets/bookmark.svg";
import rocket from "../assets/rocket.svg";
import Chat from "../Components/Chat";
import Home from "./Home";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../DataBase/FireBase";
import { addDoc, collection, orderBy, getDocs } from "firebase/firestore";
import ListCard from "../Components/ListCard";
import { values } from "../../node_modules/@mui/system/esm/breakpoints";
import { Outlet } from 'react-router-dom'
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [allDatabaseData, setAllDatabaseData] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userStatus, setUserStatus] = useState(false);
  const displayName = localStorage.getItem("name");
  const photoURL = localStorage.getItem("photoURL");
  const email = localStorage.getItem("email");

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };
  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };
  const navigate = useNavigate();
  const handelLogOut = () => {
    localStorage.clear();
    navigate("/");
  };

  useEffect(() => {
    const loggedInUser = localStorage.getItem("name");
    if (loggedInUser) {
      setUserStatus(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsAuthenticated(true);
        getDatabaseData();
      } else {
        setIsAuthenticated(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const getDatabaseData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userId = user.uid;
        const userCollectionDatabaseData = collection(
          db,
          `users/${userId}/DatabaseData`
        );
        const querySnapshotLeetcode = await getDocs(userCollectionDatabaseData);

        const allDatabaseData = [];

        querySnapshotLeetcode.forEach((doc) => {
          allDatabaseData.push(doc.data());
        });

        if (allDatabaseData.length > 0) {
          console.log(allDatabaseData);
          setAllDatabaseData(allDatabaseData);
        }
      } else {
        console.error("User not authenticated.");
      }
    } catch (e) {
      console.error("Error in fetching LeetCode data", e);
    }
  };

  return userStatus ? (
    <div className="App">
      <div className="sideBar">
        <div className="upperSide">
          <div className="upperSideTop">
            <img src={gptLogo} alt="Logo" className="logo" />
            <span className="brand">SQL Bot</span>
          </div>
          <button className="midBtn">
            <img src={addBtn} alt="new chat" className="addBtn" />
            Add Database
          </button>
          <div className="upperSideBottom">
            {allDatabaseData.map((database) => (
                 <Link to={"/dashboard/chat?v=" + database.dbname} key={database.dbname}>
              <button key={database.dbname} className="query">
                <img src={msgIcon} alt="Query" />
                {database.dbname}
              </button>
              </Link>
            ))}
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
          <button type="button" onClick={toggleDropdown}>
            <div className="listItems">
              <img
                src={photoURL}
                alt="Upgrade"
                className="w-20 h-20 rounded-full cursor-pointer p-2 mr-3"
              />{" "}
              {displayName}
            </div>
          </button>

          <div className="relative inline-block text-left pl-3">
            {isDropdownOpen && (
              <div
                id="userDropdown"
                className="z-20 absolute right-0  shadow-lg bg-indigo-50 rounded-lg shadow w-[250px] bottom-full "
                onClick={closeDropdown}
              >
                <div className="text-end p-1 pr-2">
                  <button>
                    <CloseIcon sx={{ color: "black" }} />
                  </button>
                </div>

                <div className="py-1 text-lg text-black">
                  <a
                    href="#"
                    className="block px-4 py-2 hover:bg-indigo-200 "
                    onClick={() => {
                      handelLogOut();
                    }}
                  >
                    Sign out
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="main">
      <Outlet/>
        </div>
       
      {/* <Chat/> */}
    </div>
  ) : (
    <Home />
  );
};

export default Dashboard;
