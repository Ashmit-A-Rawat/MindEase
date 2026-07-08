// src/components/chat/Context/ChatProvider.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState();
  const [user, setUser] = useState();
  const [notification, setNotification] = useState([]);
  const [chats, setChats] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo") || "null");
      setUser(userInfo);

      if (!userInfo) {
        // if not logged in, redirect to home
        return;
      }
    } catch (e) {
      // Was previously `window.location.href("...")` — calling .href as a
      // function throws (it's a string property, not a method), so this
      // catch block's own recovery path was itself broken.
      console.warn("ChatProvider: failed to parse localStorage userInfo", e);
      window.location.href = window.location.origin + "/";
    }
  }, [navigate]);

  return (
    <ChatContext.Provider
      value={{
        selectedChat,
        setSelectedChat,
        user,
        setUser,
        notification,
        setNotification,
        chats,
        setChats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatState = () => useContext(ChatContext);

export default ChatProvider;