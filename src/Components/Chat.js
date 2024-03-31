import React from 'react'
import sendBtn from "../assets/send.svg";
import userIcon from "../assets/user-icon.png";
import gptImgLogo from "../assets/chatgptLogo.svg";
import { useSearchParams } from "react-router-dom";
import { useState } from 'react';

const Chat = () => {

    const [searchParams] = useSearchParams();
    const dbName = searchParams.get("v");
    const email = localStorage.getItem("email");
    const [typedValue, setTypedValue] = useState('');

  const handleInputChange = (event) => {
    setTypedValue(event.target.value);
  };

  const handleButtonClick = () => {
    console.log('Typed value:', typedValue);
    setTypedValue('');
  };

  return (
   <div>
    <div className="chats">
      <div className="chat">
        <img className="chatimg" src={userIcon} alt="" />
        <p className="txt">
          {dbName}
          {email}
        </p>
      </div>
      <div className="chat bot">
        <img className="chatimg" src={gptImgLogo} alt="" />
        <p className="txt">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil
          similique consectetur voluptas reprehenderit dignissimos voluptate
          tempore hic. Animi pariatur quae sequi recusandae reprehenderit
          maxime repellat nam sint veniam. Et adipisci magnam nobis facere
          accusamus aperiam ipsum praesentium? Impedit voluptate earum quod!
          Repellat asperiores facere possimus ipsam omnis eius, molestias
          sed quos, fuga maiores sequi qui repellendus? Doloribus, nostrum
          excepturi. Earum, facilis quasi fugiat quo consequuntur iure
          numquam consectetur doloremque, in molestias alias ut minus
          pariatur voluptatibus amet vitae vero dolorum atque distinctio!
          Ullam ex minus nemo velit magni nulla quasi, dolorem, ut ipsum
          quisquam dolore alias eos ea impedit perspiciatis!
        </p>
      </div>
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
        ChatBot may produce incorrect information about the query being
        asked.{" "}
      </p>
    </div>
  </div>
  )
}

export default Chat