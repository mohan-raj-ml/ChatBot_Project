import React from 'react'
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const handleStart = () => {
    navigate("/dashboard/chat");
  };

  return (
    <div className="min-h-screen flex justify-center items-center">
      <div className="container mx-auto py-12">
        <h1 className="text-4xl font-bold mb-8 text-center">Welcome to the SQL Query Generator Chat Bot</h1>
        <p className="text-lg text-gray-600 mb-12 text-center">Generate SQL queries effortlessly with our chat bot. Click below to start chatting!</p>
        <div className="flex justify-center">
          <button onClick={handleStart} className="bg-gray-800 hover:bg-black text-white font-bold py-3 px-6 rounded-full text-lg">Start Chat</button>
        </div>
      </div>
    </div>
  )
}

export default Home
