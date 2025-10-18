import jwt from "jsonwebtoken";
import User from "../models/User.js";
import "dotenv/config";

export const protectRoute = async (req, res, next) => {
  try {
    // 1) If passport session already populated req.user, use that
    if (req.user) {
      return next();
    }

    // 2) Else try JWT cookie
    const token = req.cookies.jwt;
    //console.log(token)
    if(!token) {
      return res.status(401).json({message: "Unauthorized - No token provided"});
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if(!decoded) {
      return res.status(401).json({message: "Unauthorized - Invalid token"});
    }

    const user = await User.findById(decoded.userId);

    if(!user) {
      return res.status(401).json({message: "Unauthorized - User not found"});
    }
    //console.log(user);
    req.user = user;
    req.token = token;

    next();

  } catch (error) {
    console.log("Error in protectRoute middleware", error);
    res.status(500).json({message: "Internal Server Error"});
  }
}