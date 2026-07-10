import { motion } from "framer-motion";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "./config/ChatLogics";
import { ChatState } from "./Context/ChatProvider.jsx";

const ScrollableChat = ({ messages }) => {
  const { user } = ChatState();

  return (
    <div className="space-y-2 py-2">
      {messages?.map((m, i) => (
        <motion.div
          className="flex"
          key={m?._id || i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          {(isSameSender(messages, m, i, user?._id) ||
            isLastMessage(messages, i, user?._id)) && (
            <motion.div
              className="mt-1 mr-2"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              {m?.sender?.profilePic ? (
                <img
                  className="w-8 h-8 rounded-full object-cover shadow-sm"
                  src={m?.sender?.profilePic}
                  alt={m?.sender?.name || "User"}
                  title={m?.sender?.name}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {m?.sender?.name?.charAt(0) ?? "?"}
                </div>
              )}
            </motion.div>
          )}

          <motion.span
            className={`px-4 py-2 rounded-2xl max-w-[75%] text-sm shadow-sm ${
              m?.sender?._id === user?._id
                ? "bg-indigo-500 text-white self-end ml-auto"
                : "bg-white text-gray-800 border border-gray-200"
            }`}
            style={{
              marginLeft: isSameSenderMargin(messages, m, i, user?._id),
              marginTop: isSameUser(messages, m, i, user?._id) ? 3 : 10,
            }}
            whileHover={{
              scale: 1.02,
              transition: { duration: 0.2 },
            }}
          >
            {m?.content ?? ""}
          </motion.span>
        </motion.div>
      ))}
    </div>
  );
};

export default ScrollableChat;