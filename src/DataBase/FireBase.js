
import { initializeApp } from "firebase/app";
import {getAuth , GoogleAuthProvider , signInWithPopup} from 'firebase/auth'
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBBeqOh0FHkOmkyDbcNqdmzLlyy0Hztsjs",
    authDomain: "sql-bot-da600.firebaseapp.com",
    projectId: "sql-bot-da600",
    storageBucket: "sql-bot-da600.appspot.com",
    messagingSenderId: "1029987381487",
    appId: "1:1029987381487:web:4d5a51e04b2959cd506b1a",
    measurementId: "G-5ZDQC5WSY3"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
const provider = new GoogleAuthProvider();


export const SignInWithGoogle = () => {
    return new Promise((resolve, reject) => {
      signInWithPopup(auth, provider)
        .then((result) => {
          console.log(result);
          const name = result.user.displayName;
          const email = result.user.email;
          const photoURL = result.user.photoURL;
          localStorage.setItem("name", name);
          localStorage.setItem("email", email);
          localStorage.setItem("photoURL", photoURL);
          resolve(result); 
        })
        .catch((error) => {
          console.log(error);
          reject(error); 
        });
    });
 };
  
  