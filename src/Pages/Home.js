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
    <div className="my-5">
            <button
              onClick={() => {
              
                handleSignInWithGoogle();
              }}
              className="p-3 py-4 mt-12 px-12 mt-3 mx-2 hover:bg-black bg-[#323234] text-white rounded-full text-[18px]"
            >
              Let's Get Started
            </button>
          </div>
  )
}

export default Home