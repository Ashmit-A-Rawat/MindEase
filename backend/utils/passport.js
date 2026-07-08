import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import "dotenv/config";
import User from "../models/User.js";
import { generateUniqueUsername } from "./helper.js";


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5001/api1/auth/google/callback",
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value || null;
        const fullName = profile.displayName || "";
        const profilePic = profile.photos?.[0]?.value || "";

        let user = await User.findOne({ googleId });
        if (!user) {
          const username = await generateUniqueUsername();

          user = await User.create({
            googleId,
            email,
            fullName,
            username,
            profilePic,
            role: "student",
          });
        } else {
          // Update changed fields
          const changed = {};
          if (user.fullName !== fullName) changed.fullName = fullName;
          if (user.email !== email) changed.email = email;
          if (user.profilePic !== profilePic) changed.profilePic = profilePic;

          if (Object.keys(changed).length) {
            await User.findByIdAndUpdate(user._id, changed, { new: true });
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
  try {
    if (!id) return done(null, false);
    const user = await User.findById(id).select("-__v");
    return done(null, user);
  } catch (err) {
    console.error("Deserialize error:", err.message);
    return done(null, false);
  }
});

export default passport;