import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ProfileModal from "./ProfileModal";
import UserListItem from "../userAvatar/UserListItem";
import { ChatState } from "../Context/ChatProvider";
import { axiosInstance } from "../../../lib/api";

function SideDrawer() {
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const { setSelectedChat, user, notification, setNotification, chats, setChats } =
    ChatState();

  const navigate = useNavigate();

  const logoutHandler = () => {
    localStorage.removeItem("userInfo");
    navigate("/");
  };

  const handleSearch = async () => {
    if (!search) {
      alert("Please enter something in search");
      return;
    }
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      };
      const { data } = await axiosInstance.get(`/user/search?search=${search}`, config);
      setSearchResult(data);
      setLoading(false);
    } catch (error) {
      console.log(error)
      setLoading(false);
      alert("Error: Failed to load search results");
    }
  };

  const accessChat = async (userId) => {
    try {
      setLoadingChat(true);
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
      };
      const { data } = await axiosInstance.post(`/chat`, { userId }, config);
      if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
      setSelectedChat(data);
      setLoadingChat(false);
      setIsOpen(false);
    } catch (error) {
      console.log(error);
      setLoadingChat(false);
      alert("Error: Failed to access chat");
    }
  };

  return (
    <>
      {/* Top Navbar */}
      <motion.div 
        className="flex justify-between items-center bg-white w-full p-4 border-b shadow-md"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Search Button */}
        <motion.button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-indigo-50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="hidden md:inline">Search User</span>
        </motion.button>

        {/* App Name */}
        <motion.h1 
          className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          Talk-A-Tive
        </motion.h1>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <div className="relative group">
            <motion.button 
              className="relative p-2 rounded-full hover:bg-indigo-50 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notification.length > 0 && (
                <motion.span 
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  {notification.length}
                </motion.span>
              )}
            </motion.button>
            
            {/* Dropdown for notifications */}
            <div className="absolute hidden group-hover:block right-0 mt-2 w-64 bg-white border rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                <h3 className="font-semibold text-gray-700">Notifications</h3>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {!notification.length && (
                  <p className="px-4 py-3 text-gray-500 text-sm">No New Messages</p>
                )}
                {notification.map((notif) => (
                  <motion.button
                    key={notif._id}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                    onClick={() => {
                      setSelectedChat(notif.chat);
                      setNotification(notification.filter((n) => n !== notif));
                    }}
                    whileHover={{ x: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <p className="text-sm font-medium text-gray-800">
                      {notif.chat.isGroupChat
                        ? `New Message in ${notif.chat.chatName}`
                        : `New Message from ${notif.chat.users
                            .filter((u) => u._id !== user._id)
                            .map((u) => u.username)
                            .join(", ")}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notif.createdAt).toLocaleTimeString()}
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Profile Menu */}
          <div className="relative group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img
                src={user?.profilePic}
                alt={user?.name || "User"}
                className="w-10 h-10 rounded-full cursor-pointer object-cover border-2 border-white shadow"
              />
            </motion.div>
            <div className="absolute hidden group-hover:block right-0 mt-2 w-48 bg-white border rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="p-3 border-b">
                <p className="text-sm font-medium text-gray-800">{user?.username}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <ProfileModal user={user}>
                <button className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  My Profile
                </button>
              </ProfileModal>
              <hr />
              
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              className="fixed inset-0 bg-opacity-50 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            ></motion.div>
            
            <motion.div 
              className="fixed inset-y-0 left-0 bg-white w-80 h-full shadow-xl z-50 flex flex-col"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-800">Search Users</h2>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-4 border-b">
                <div className="flex">
                  <input
                    type="text"
                    placeholder="Search by name or email"
                    className="flex-grow border rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <motion.button
                    onClick={handleSearch}
                    className="bg-indigo-500 text-white px-4 py-2 rounded-r-lg hover:bg-indigo-600 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </motion.button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                  <div className="flex justify-center items-center h-20">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <>
                    {searchResult.length > 0 ? (
                      searchResult.map((u) => (
                        <UserListItem
                          key={u._id}
                          user={u}
                          handleFunction={() => accessChat(u._id)}
                        />
                      ))
                    ) : (
                      search && (
                        <div className="text-center p-6 text-gray-500">
                          No users found for "{search}"
                        </div>
                      )
                    )}
                  </>
                )}

                {loadingChat && (
                  <div className="flex justify-center items-center h-20">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-gray-600">Opening chat...</span>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default SideDrawer;





//<button
//                className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm flex items-center"
//                onClick={logoutHandler}
//              >
//                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
//                </svg>
//                Logout
//              </button>