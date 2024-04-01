import React ,{useEffect} from "react";
import sendBtn from "../assets/send.svg";
import userIcon from "../assets/user-icon.png";
import gptImgLogo from "../assets/chatgptLogo.svg";
import { Form, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { auth, db } from "../DataBase/FireBase";
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





  return (
    <div>
        <h1 className="text-[20px]"> Database Name :  {dbName} </h1>
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
          <input
            type="text"
            placeholder="Send a Message..."
            value={typedValue}
            onChange={handleInputChange}
          />
          <button className="send" onClick={handleButtonClick}>
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