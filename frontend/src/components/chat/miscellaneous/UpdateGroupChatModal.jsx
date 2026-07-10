import { useState } from "react";
import { ChatState } from "../Context/ChatProvider";
import { FaEye } from "react-icons/fa";
import { axiosInstance } from "../../../lib/api";
import UserBadgeItem from "../userAvatar/UserBadgeItem";
import UserListItem from "../userAvatar/UserListItem";

const UpdateGroupChatModal = ({ fetchMessages, fetchAgain, setFetchAgain }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [groupChatName, setGroupChatName] = useState("");
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [renameloading, setRenameLoading] = useState(false);

  const { selectedChat, setSelectedChat, user } = ChatState();

  const handleSearch = async (query) => {
    setSearch(query);
    if (!query) return;

    try {
      setLoading(true);
      const { data } = await axiosInstance.get(`/user/search?search=${query}`);
      setSearchResult(data);
      setLoading(false);
    } catch (error) {
      console.error("Search failed:", error);
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!groupChatName) return;
    try {
      setRenameLoading(true);
      const { data } = await axiosInstance.put(`/chat/rename`, {
        chatId: selectedChat._id,
        chatName: groupChatName,
      });
      setSelectedChat(data);
      setFetchAgain(!fetchAgain);
      setRenameLoading(false);
      setGroupChatName("");
    } catch (error) {
      console.error("Rename failed:", error);
      setRenameLoading(false);
    }
  };

  const handleAddUser = async (user1) => {
    if (selectedChat.users.find((u) => u._id === user1._id)) {
      alert("User already in group!");
      return;
    }
    if (selectedChat.groupAdmin._id !== user._id) {
      alert("Only admins can add someone!");
      return;
    }
    try {
      setLoading(true);
      const { data } = await axiosInstance.put(`/chat/groupadd`, {
        chatId: selectedChat._id,
        userId: user1._id,
      });
      setSelectedChat(data);
      setFetchAgain(!fetchAgain);
      setLoading(false);
    } catch (error) {
      console.error("Add user failed:", error);
      setLoading(false);
    }
  };

  const handleRemove = async (user1) => {
    if (selectedChat.groupAdmin._id !== user._id && user1._id !== user._id) {
      alert("Only admins can remove someone!");
      return;
    }
    try {
      setLoading(true);
      const { data } = await axiosInstance.put(`/chat/groupremove`, {
        chatId: selectedChat._id,
        userId: user1._id,
      });
      user1._id === user._id ? setSelectedChat() : setSelectedChat(data);
      setFetchAgain(!fetchAgain);
      fetchMessages();
      setLoading(false);
    } catch (error) {
      console.error("Remove user failed:", error);
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-full hover:bg-gray-200"
      >
        <FaEye size={20} />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold text-center w-full">
                {selectedChat.chatName}
              </h2>
              <button
                className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* Users list */}
              <div className="flex flex-wrap gap-2">
                {selectedChat.users.map((u) => (
                  <UserBadgeItem
                    key={u._id}
                    user={u}
                    admin={selectedChat.groupAdmin}
                    handleFunction={() => handleRemove(u)}
                  />
                ))}
              </div>

              {/* Rename chat */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Chat Name"
                  value={groupChatName}
                  onChange={(e) => setGroupChatName(e.target.value)}
                  className="w-full p-2 border rounded"
                />
                <button
                  onClick={handleRename}
                  disabled={renameloading}
                  className="px-3 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 disabled:opacity-50"
                >
                  {renameloading ? "Updating..." : "Update"}
                </button>
              </div>

              {/* Search users */}
              <input
                type="text"
                placeholder="Add user to group"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full p-2 border rounded"
              />

              {/* Search results */}
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="w-8 h-8 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
                </div>
              ) : (
                searchResult?.map((user) => (
                  <UserListItem
                    key={user._id}
                    user={user}
                    handleFunction={() => handleAddUser(user)}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t">
              <button
                onClick={() => handleRemove(user)}
                className="px-4 py-2 text-white bg-red-500 rounded hover:bg-red-600"
              >
                Leave Group
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UpdateGroupChatModal;
