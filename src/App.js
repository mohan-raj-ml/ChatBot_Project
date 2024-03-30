import './App.css';
import gptLogo from './assets/chatgpt.svg';
import addBtn from './assets/add-30.png';
import msgIcon from './assets/message.svg';
import home from './assets/home.svg';
import saved from './assets/bookmark.svg';
import rocket from './assets/rocket.svg';
import sendBtn from './assets/send.svg';
import userIcon from './assets/user-icon.png';
import gptImgLogo from './assets/chatgptLogo.svg';


function App() {
  return (
    <div className="App">
      <div className="sideBar">
        <div className="upperSide">
            <div className="upperSideTop"><img src={gptLogo} alt="Logo" className="logo" /><span className="brand">ChatBot</span></div>
              <button className="midBtn"><img src={addBtn} alt="new chat" className="addBtn" />New Chat</button>
              <div className="upperSideBottom">
                <button className="query"><img src={msgIcon} alt="Query" />How to create table ? </button>
                <button className="query"><img src={msgIcon} alt="Query" />How to create table ? </button>
              </div>
            
        </div>
        <div className="lowerSide">
          <div className="listItems"><img src={home} alt="Home" className="listitemsImg" />Home</div>
          <div className="listItems"><img src={saved} alt="Saved" className="listitemsImg" />Saved</div>
          <div className="listItems"><img src={rocket} alt="Upgrade" className="listitemsImg" />Upgrade to Pro</div>
        </div>
      </div>
      <div className="main">
        <div className="chats">
            <div className="chat">
              <img className="chatimg" src={userIcon} alt="" /><p className="txt">Lorem ipsum dolor sit amet, consectetur adipisicing elit. Qui inventore repellendus veritatis eligendi eaque, mollitia laborum, illo facilis blanditiis explicabo sunt dignissimos saepe consequuntur itaque iure nam soluta. Animi, perferendis!</p>
            </div>
            <div className="chat bot">
              <img className="chatimg" src={gptImgLogo} alt="" /><p className="txt">Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil similique consectetur voluptas reprehenderit dignissimos voluptate tempore hic. Animi pariatur quae sequi recusandae reprehenderit maxime repellat nam sint veniam. Et adipisci magnam nobis facere accusamus aperiam ipsum praesentium? Impedit voluptate earum quod! Repellat asperiores facere possimus ipsam omnis eius, molestias sed quos, fuga maiores sequi qui repellendus? Doloribus, nostrum excepturi. Earum, facilis quasi fugiat quo consequuntur iure numquam consectetur doloremque, in molestias alias ut minus pariatur voluptatibus amet vitae vero dolorum atque distinctio! Ullam ex minus nemo velit magni nulla quasi, dolorem, ut ipsum quisquam dolore alias eos ea impedit perspiciatis!</p>
            </div>
        </div>
        <div className="chatFooter">
          <div className="inp">
            <input type="text" placeholder='Send a Message...'/> <button className="send"><img src={sendBtn} alt="Send" /></button>
          </div>
          <p>chatBot may produce incorrect information about the query being asked. </p>
        </div>
      </div>
    </div>
  );
}

export default App;
