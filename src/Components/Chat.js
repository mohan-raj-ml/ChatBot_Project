import React ,{useEffect} from "react";
import sendBtn from "../assets/send.svg";
import userIcon from "../assets/user-icon.png";
import gptImgLogo from "../assets/chatgptLogo.svg";
import { Form, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { auth, db } from "../DataBase/FireBase";
import MicIcon from '@mui/icons-material/Mic';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  orderBy,
  setDoc,
  getDoc,
  addDoc,
} from "firebase/firestore";
const Chat = () => {
  const [searchParams] = useSearchParams();
  const dbName = searchParams.get("v");
  const username = searchParams.get("u");
  const password = searchParams.get("p");
  const id = searchParams.get("id");
  const photoURL = localStorage.getItem("photoURL");
  const email = localStorage.getItem("email");
  const [typedValue, setTypedValue] = useState("");
  const [responseData, setResponseData] = useState(null);
  const user = auth.currentUser;
  const handleInputChange = (event) => {
    setTypedValue(event.target.value);
  };

  const handleButtonClick = async () => {
    console.log(dbName);
    if (user) {
      try {
        const userID = user.uid;
        const userDocRef = doc(db, "users", userID);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const databaseDataRef = collection(userDocRef, "DatabaseData");
          const querySnapshot = await getDocs(
            query(databaseDataRef, where("dbname", "==", dbName))
          );

          if (!querySnapshot.empty) {
            querySnapshot.forEach(async (doc) => {
              const messageCollectionRef = collection(doc.ref, "Message");
              await addDoc(messageCollectionRef, {
                message: typedValue,
                timeStamp: new Date(),
                type: "Sender",
              });
              const requestBody = {
                username: username,
                password: password,
                dbname: dbName,
                queryname: typedValue,
              };

              const response = await fetch("http://192.0.0.2:8000/sql/", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
              })
                .then((response) => response.json())
                .then(async (data) => {
                  console.log(data);
                  setResponseData(data);
                  const formattedTable = data.table.map((item) => ({
                    value: item,
                  }));
                  await addDoc(messageCollectionRef, {
                    status: 1,
                    message: data.query,
                    result: formattedTable,
                    timeStamp: new Date(),
                    type: "Receiver",
                  });
                })
                .catch(async (error) => {
                  console.error("Error:", error);
                  await addDoc(messageCollectionRef, {
                    status: 0,
                    message:
                      "Something went wrong please try again after some time!",
                    timeStamp: new Date(),
                    type: "Receiver",
                  });
                });
            });
          } else {
            console.log(
              "No documents found with dbname = 'patient' in DatabaseData collection."
            );
          }
        } else {
          console.log("User document does not exist.");
        }
      } catch (err) {
        console.log(err);
      }
    }

    setTypedValue("");
  };


  const [ MessageData , setMessageData] = useState([]);

  const getMessageData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userId = user.uid;
        const userCollectionMessageData = collection(
          db,
          `users/${userId}/DatabaseData/${id}/Message`
        );
  
        // Construct a new query with orderBy clause for timestamp field
        const querySnapshotMessageData = await getDocs(
          query(userCollectionMessageData, orderBy('timeStamp', 'asc'))
        );
  
        const allMessageData = [];
        querySnapshotMessageData.forEach((doc) => {
          // Use doc.data() to access the data of the document
          allMessageData.push(doc.data());
        });
  
        if (allMessageData.length > 0) {
          console.log("Message data retrieved successfully:", allMessageData);
          setMessageData(allMessageData);
        } else {
          console.log("No message data found.");
        }
      } else {
        console.error("User not authenticated.");
      }
    } catch (e) {
      console.error("Error in fetching Message data", e);
    }
  };
  
  
  useEffect(()=>{
    
    getMessageData();
    setMessageData();
    
  },[id])
  useEffect(()=>{
    
    getMessageData();
   
    
  },[typedValue])


  const handleVoiceToText = () => {
    const recognition = new window.webkitSpeechRecognition(); // Initialize speech recognition
    recognition.lang = 'en-US'; // Set recognition language
    
    recognition.onresult = (event) => {
    
      const speechToText = event.results[0][0].transcript; // Get the recognized text
      setTypedValue(speechToText); // Set the recognized text into the input field
    };
    recognition.start(); // Start speech recognition
    setTypedValue("Listening...")
  };


  return (
    <div>
       
<div className="chats overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
{
  MessageData && MessageData.length > 0 ? (
    MessageData.map((message, index) => (
        
      <div className={`chat ${message.type === "Sender" ? "sender" : "bot"}`} key={index}>
        <img className="chatimg" src={message.type === "Sender" ? photoURL : gptImgLogo} alt="" />
        <p className="txt text-[14px]">
        {message.type === "Sender" ? (
            message.message
          ) : (
            <>
            <h1 className="py-5">{message.message}</h1>
              {message.result ? (
               <table className="w-full border-collapse border border-gray-200">
               <thead>
                 <tr className="bg-gray-100">
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                 </tr>
               </thead>
               <tbody>
                 {message.result.map((item, i) => (
                   <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.value}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
             
              ) : (
                <p>No data available</p>
              )}
            </>
          )}
          
        </p>
      </div>
    ))
  ) : (
    <div className="chat bot">
      <img className="chatimg" src={gptImgLogo} alt="" />
      <p className="txt">Yet to start the conversation</p>
    </div>
  )
}
</div>

      <div className="chatFooter">
      <div className="inp">
      <button className="send pl-5" onClick={handleVoiceToText}>
        <MicIcon sx={{ fontSize: 20 }} />
      </button>
      <input
       className="text-[14px]"
        type="text"
        placeholder="Send a Message..."
        value={typedValue}
        onChange={handleInputChange}
      />
      <button className="send p-5" onClick={handleButtonClick}>
        <img src={sendBtn} alt="Send" />
      </button>
    </div>
        <p>
          ChatBot may produce incorrect information about the query being asked.{" "}
        </p>
      </div>
    </div>
  );
};

export default Chat;