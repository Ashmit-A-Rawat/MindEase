import { useEffect, useState } from "react";
import { axiosInstance, BACKEND_URL } from "../../lib/api.js";
import { ArrowLeft, Send, Image, Smile } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "react-lottie";
import io from "socket.io-client";
import animationData from "./animations/typing.json";
import { getSender, getSenderFull } from "./config/ChatLogics.js";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import { ChatState } from "./Context/ChatProvider";

const ENDPOINT = BACKEND_URL;
let socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [istyping, setIsTyping] = useState(false);
  const [senderFull, setSenderFull] = useState(null);

  const { selectedChat, setSelectedChat, user, notification, setNotification } =
    ChatState();

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  useEffect(() => {
    if (selectedChat && !selectedChat.isGroupChat) {
      const sender = getSenderFull(user, selectedChat.users);
      setSenderFull(sender);
    }
  }, [selectedChat, user]);

  const fetchMessages = async () => {
    if (!selectedChat) return;
    try {
      setLoading(true);
      const { data } = await axiosInstance.get(`/message/${selectedChat._id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setMessages(data);
      setLoading(false);
      socket.emit("join chat", selectedChat._id);
    } catch (error) {
      console.error("Failed to load messages", error);
    }
  };

  const sendMessage = async (event) => {
    if ((event.key === "Enter" || event.type === "click") && newMessage) {
      socket.emit("stop typing", selectedChat._id);
      try {
        const { data } = await axiosInstance.post(
          "/message",
          { content: newMessage, chatId: selectedChat },
          {
            headers: {
              "Content-type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
          }
        );
        setNewMessage("");
        socket.emit("new message", data);
        setMessages([...messages, data]);
      } catch (error) {
        console.error("Failed to send message", error);
      }
    }
  };

  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));
  }, [user]);

  useEffect(() => {
    fetchMessages();
    selectedChatCompare = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    socket.on("message recieved", (newMessageRecieved) => {
      if (!selectedChatCompare || selectedChatCompare._id !== newMessageRecieved.chat._id) {
        if (!notification.includes(newMessageRecieved)) {
          setNotification([newMessageRecieved, ...notification]);
          setFetchAgain(!fetchAgain);
        }
      } else {
        setMessages([...messages, newMessageRecieved]);
      }
    });
  });

  const typingHandler = (e) => {
    setNewMessage(e.target.value);
    if (!socketConnected) return;
    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }
    let lastTypingTime = new Date().getTime();
    let timerLength = 3000;
    setTimeout(() => {
      let timeNow = new Date().getTime();
      let timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  return (
    <>
      {selectedChat ? (
        <div className="flex flex-col h-full w-full">
          {/* Header */}
          <motion.div 
            className="flex items-center justify-between w-full px-4 py-3 bg-white border-b shadow-sm"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center space-x-3">
              <button
                className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-colors"
                onClick={() => setSelectedChat("")}
              >
                <ArrowLeft size={20} />
              </button>
              {messages &&
                (!selectedChat.isGroupChat ? (
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      {senderFull && senderFull.profilePic ? (
                        <div>
                          <img
                          src={senderFull?.profilePic}
                          alt={getSender(user, selectedChat.users)}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                          {getSender(user, selectedChat?.users)?.charAt(0)}
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                      <div>{senderFull?.username}</div>
                      <h2 className="font-semibold text-gray-800">{getSender(user, selectedChat.users)}</h2>
                      <p className="text-xs text-gray-500">Online</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                        {selectedChat.chatName?.charAt(0)}
                      </div>
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-800">{selectedChat.chatName}</h2>
                      <p className="text-xs text-gray-500">{selectedChat.users.length} members</p>
                    </div>
                  </div>
                ))}
            </div>
            
            <div className="flex items-center space-x-2">
              {!selectedChat.isGroupChat ? (
                <ProfileModal user={senderFull}>
                  <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </button>
                </ProfileModal>
              ) : (
                <UpdateGroupChatModal
                  fetchMessages={fetchMessages}
                  fetchAgain={fetchAgain}
                  setFetchAgain={setFetchAgain}
                />
              )}
            </div>
          </motion.div>

          {/* Messages area */}
          <div className="flex-1 bg-gradient-to-b from-gray-50 to-gray-100 p-4 overflow-hidden flex flex-col w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <motion.div 
                  className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                ></motion.div>
              </div>
            ) : (
              <div className="messages flex-1 overflow-y-auto mb-3 w-full">
                <ScrollableChat messages={messages} />
              </div>
            )}

            {/* Typing animation */}
            <AnimatePresence>
              {istyping && (
                <motion.div 
                  className="mb-2 flex items-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="bg-white rounded-full p-2 shadow-sm">
                    <Lottie options={defaultOptions} width={40} height={40} />
                  </div>
                  <span className="text-sm text-gray-500 ml-2">is typing...</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input box */}
            <motion.div 
              className="flex items-center bg-white rounded-2xl p-2 shadow-md border w-full"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <button className="p-2 text-gray-500 hover:text-indigo-500 transition-colors">
                <Smile size={20} />
              </button>
              <button className="p-2 text-gray-500 hover:text-indigo-500 transition-colors">
                <Image size={20} />
              </button>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={typingHandler}
                onKeyDown={sendMessage}
                className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none"
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={sendMessage}
                disabled={!newMessage}
                className={`p-2 rounded-full ${newMessage ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-400'}`}
              >
                <Send size={18} />
              </motion.button>
            </motion.div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full w-full">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a conversation</h3>
            <p className="text-gray-500">Choose a chat from the sidebar to start messaging</p>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default SingleChat;