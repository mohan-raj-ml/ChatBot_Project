import React from 'react'
import { SignInWithGoogle } from "../DataBase/FireBase"
import { useNavigate } from "react-router-dom";

const Home = () => {
    const navigate = useNavigate();
    const handleSignInWithGoogle = () => {
        SignInWithGoogle()
          .then(() => {
            navigate("/dashboard");
          })
          .catch((error) => {
            console.log(error);
          });
      };

  return (
    <div className=" min-h-screen flex justify-center items-center">
      <div className="container mx-auto py-12">
        <h1 className="text-4xl font-bold mb-8 text-center">Welcome to the SQL Query Generator Chat Bot</h1>
        <p className="text-lg text-gray-600 mb-12 text-center">Generate SQL queries effortlessly with our chat bot. Simply click the button below to get started!</p>
        <div className="flex justify-center">
          <button onClick={handleSignInWithGoogle} className="bg-gray-800 hover:bg-black text-white font-bold py-3 px-6 rounded-full text-lg">Let's Get Started</button>
        </div>
      </div>
    </div>
  )
}

export default Home

