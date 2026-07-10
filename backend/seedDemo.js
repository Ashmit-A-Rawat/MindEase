// backend/seedDemo.js
//
// One-shot demo-data reset: wipes user-generated collections (users, slots,
// appointments, wellness intakes, test results, chats, messages, sessions)
// and repopulates them with realistic-looking data for a live demo. Does
// NOT touch testquestions — that's static reference content (PHQ-9/GAD-7/
// GHQ-12 question banks), not user data.
//
// Usage: node seedDemo.js  (reads MONGO_URI from backend/.env)
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

import User from "./models/User.js";
import Slot from "./models/Slot.js";
import Appointment from "./models/Appointment.js";
import WellnessIntake from "./models/WellnessIntake.js";
import TestResult from "./models/TestResult.js";
import Chat from "./models/Chat.js";
import Message from "./models/Message.js";

dotenv.config();

const DEMO_PASSWORD = "demo1234";

async function main() {
  await connectDB();

  console.log("Clearing user-generated collections...");
  await Promise.all([
    User.deleteMany({}),
    Slot.deleteMany({}),
    Appointment.deleteMany({}),
    WellnessIntake.deleteMany({}),
    TestResult.deleteMany({}),
    Chat.deleteMany({}),
    Message.deleteMany({}),
    mongoose.connection.db.collection("sessions").deleteMany({}),
  ]);

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ---------------- Counsellors ----------------
  const counsellorSpecs = [
    { username: "dr_priya_sharma", email: "priya.sharma@mindease.demo", fullName: "Dr. Priya Sharma" },
    { username: "dr_arjun_mehta", email: "arjun.mehta@mindease.demo", fullName: "Dr. Arjun Mehta" },
    { username: "dr_kavya_nair", email: "kavya.nair@mindease.demo", fullName: "Dr. Kavya Nair" },
  ];
  const counsellors = await User.insertMany(
    counsellorSpecs.map((c) => ({
      ...c,
      role: "counsellor",
      password: hashedPassword,
      isVerified: true,
    }))
  );
  console.log(`Created ${counsellors.length} counsellors`);

  // ---------------- Students ----------------
  const studentSpecs = [
    { username: "rohan_verma", email: "rohan.verma@student.demo", fullName: "Rohan Verma", collegeName: "Thadomal Shahani Engineering College", academicYear: "2024-25", isVerified: true },
    { username: "ananya_iyer", email: "ananya.iyer@student.demo", fullName: "Ananya Iyer", collegeName: "Thadomal Shahani Engineering College", academicYear: "2023-24", isVerified: true },
    { username: "karan_malhotra", email: "karan.malhotra@student.demo", fullName: "Karan Malhotra", collegeName: "VJTI Mumbai", academicYear: "2024-25", isVerified: true },
    { username: "sneha_reddy", email: "sneha.reddy@student.demo", fullName: "Sneha Reddy", collegeName: "VJTI Mumbai", academicYear: "2022-23", isVerified: true },
    { username: "aditya_kapoor", email: "aditya.kapoor@student.demo", fullName: "Aditya Kapoor", collegeName: "Thadomal Shahani Engineering College", academicYear: "2024-25", isVerified: false },
  ];
  const students = await User.insertMany(
    studentSpecs.map((s) => ({
      ...s,
      role: "student",
      password: hashedPassword,
    }))
  );
  console.log(`Created ${students.length} students`);

  const [rohan, ananya, karan, sneha, aditya] = students;
  const [drPriya, drArjun, drKavya] = counsellors;

  // ---------------- Wellness intakes (skip Aditya — unverified) ----------------
  await WellnessIntake.insertMany([
    { studentId: rohan._id, gender: "Male", city: "Mumbai", cgpa: 8.4, academicPressure: 3, workPressure: 0, studySatisfaction: 4, sleepDuration: "7-8 hours", dietaryHabits: "Healthy", degree: "BTech Computer Engineering", workStudyHours: 6, financialStress: 2, familyHistory: false },
    { studentId: ananya._id, gender: "Female", city: "Pune", cgpa: 6.2, academicPressure: 5, workPressure: 3, studySatisfaction: 2, sleepDuration: "Less than 5 hours", dietaryHabits: "Unhealthy", degree: "BTech Information Technology", workStudyHours: 12, financialStress: 4, familyHistory: true },
    { studentId: karan._id, gender: "Male", city: "Mumbai", cgpa: 7.5, academicPressure: 3, workPressure: 1, studySatisfaction: 3, sleepDuration: "5-6 hours", dietaryHabits: "Moderate", degree: "BTech Mechanical Engineering", workStudyHours: 8, financialStress: 2, familyHistory: false },
    { studentId: sneha._id, gender: "Female", city: "Bengaluru", cgpa: 9.1, academicPressure: 2, workPressure: 0, studySatisfaction: 5, sleepDuration: "7-8 hours", dietaryHabits: "Healthy", degree: "BTech Electronics", workStudyHours: 5, financialStress: 1, familyHistory: false },
  ]);
  console.log("Created wellness intakes");

  // ---------------- Test results (varied severities + a trend for Ananya) ----------------
  const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  await TestResult.insertMany([
    {
      studentId: rohan._id,
      tests: [
        { testType: "PHQ-9", answers: [1, 1, 0, 1, 0, 0, 1, 0, 0], score: 4, severity: "Minimal", recommendation: "Keep up your current wellness routine.", createdAt: daysAgo(10) },
        { testType: "GAD-7", answers: [1, 1, 1, 0, 0, 0, 0], score: 3, severity: "Minimal", recommendation: "No significant anxiety detected.", createdAt: daysAgo(9) },
      ],
    },
    {
      studentId: ananya._id,
      tests: [
        { testType: "PHQ-9", answers: [2, 2, 2, 1, 2, 1, 1, 0, 0], score: 11, severity: "Moderate", recommendation: "Consider speaking with a counsellor.", createdAt: daysAgo(25) },
        { testType: "PHQ-9", answers: [3, 2, 3, 2, 2, 2, 1, 1, 0], score: 16, severity: "Moderately Severe", recommendation: "Please book a session with a campus counsellor soon.", createdAt: daysAgo(12) },
        { testType: "GAD-7", answers: [3, 3, 2, 2, 2, 1, 1], score: 14, severity: "Moderate", recommendation: "Anxiety levels are elevated — consider professional support.", createdAt: daysAgo(11) },
        { testType: "GHQ-12", answers: [2, 2, 1, 2, 2, 1, 2, 1, 2, 1, 1, 2], score: 19, severity: "High", recommendation: "Your responses suggest significant distress — please reach out for support.", createdAt: daysAgo(5) },
      ],
    },
    {
      studentId: karan._id,
      tests: [
        { testType: "GAD-7", answers: [1, 2, 1, 1, 0, 1, 0], score: 6, severity: "Mild", recommendation: "Mild anxiety — mindfulness exercises may help.", createdAt: daysAgo(7) },
      ],
    },
    {
      studentId: sneha._id,
      tests: [
        { testType: "PHQ-9", answers: [0, 1, 0, 0, 0, 0, 0, 0, 0], score: 1, severity: "Minimal", recommendation: "You're doing great — keep it up!", createdAt: daysAgo(3) },
      ],
    },
  ]);
  console.log("Created test results");

  // ---------------- Slots (mix of available/booked, online/offline) ----------------
  const inDays = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

  const slotDocs = await Slot.insertMany([
    { counsellorName: drPriya.fullName, counsellorEmail: drPriya.email, date: inDays(1), time: "10:00 AM", mode: "Online", meetingLink: "https://meet.google.com/priya-slot-1", isBooked: false },
    { counsellorName: drPriya.fullName, counsellorEmail: drPriya.email, date: inDays(2), time: "02:00 PM", mode: "Offline", location: "Wellness Center, Room 204", isBooked: false },
    { counsellorName: drPriya.fullName, counsellorEmail: drPriya.email, date: inDays(3), time: "11:00 AM", mode: "Online", meetingLink: "https://meet.google.com/priya-slot-2", isBooked: false },
    { counsellorName: drArjun.fullName, counsellorEmail: drArjun.email, date: inDays(1), time: "04:00 PM", mode: "Online", meetingLink: "https://meet.google.com/arjun-slot-1", isBooked: false },
    { counsellorName: drArjun.fullName, counsellorEmail: drArjun.email, date: inDays(4), time: "09:30 AM", mode: "Offline", location: "Wellness Center, Room 108", isBooked: false },
    { counsellorName: drKavya.fullName, counsellorEmail: drKavya.email, date: inDays(2), time: "03:30 PM", mode: "Online", meetingLink: "https://meet.google.com/kavya-slot-1", isBooked: false },
    // Booked slots (paired with appointments below)
    { counsellorName: drPriya.fullName, counsellorEmail: drPriya.email, date: daysAgo(2), time: "01:00 PM", mode: "Online", meetingLink: "https://meet.google.com/priya-past-1", isBooked: true },
    { counsellorName: drArjun.fullName, counsellorEmail: drArjun.email, date: inDays(1), time: "05:00 PM", mode: "Online", meetingLink: "https://meet.google.com/arjun-upcoming-1", isBooked: true },
  ]);
  console.log(`Created ${slotDocs.length} slots`);

  // ---------------- Appointments (matching the two booked slots above) ----------------
  await Appointment.insertMany([
    {
      studentName: ananya.fullName, studentEmail: ananya.email,
      counsellorName: drPriya.fullName, counsellorEmail: drPriya.email,
      date: daysAgo(2), time: "01:00 PM", mode: "Online", meetingLink: "https://meet.google.com/priya-past-1",
      status: "Completed",
    },
    {
      studentName: rohan.fullName, studentEmail: rohan.email,
      counsellorName: drArjun.fullName, counsellorEmail: drArjun.email,
      date: inDays(1), time: "05:00 PM", mode: "Online", meetingLink: "https://meet.google.com/arjun-upcoming-1",
      status: "Pending",
    },
  ]);
  console.log("Created appointments");

  // ---------------- Chats + messages (peer support) ----------------
  const oneOnOne = await Chat.create({
    isGroupChat: false,
    users: [rohan._id, karan._id],
  });
  const msgs1 = await Message.insertMany([
    { sender: rohan._id, content: "Hey, are you joining the study group tonight?", chat: oneOnOne._id, readBy: [rohan._id] },
    { sender: karan._id, content: "Yeah for sure, 7pm right?", chat: oneOnOne._id, readBy: [karan._id] },
    { sender: rohan._id, content: "Yep! Also finally took the GAD-7 test, feeling better about managing stress now.", chat: oneOnOne._id, readBy: [rohan._id] },
  ]);
  oneOnOne.latestMessage = msgs1[msgs1.length - 1]._id;
  await oneOnOne.save();

  const group = await Chat.create({
    isGroupChat: true,
    chatName: "Exam Season Support",
    users: [rohan._id, ananya._id, karan._id, sneha._id],
    groupAdmin: rohan._id,
  });
  const msgs2 = await Message.insertMany([
    { sender: sneha._id, content: "Anyone else feeling overwhelmed with finals coming up?", chat: group._id, readBy: [sneha._id] },
    { sender: ananya._id, content: "Same here honestly. Trying to take it one day at a time.", chat: group._id, readBy: [ananya._id] },
    { sender: karan._id, content: "The breathing exercises on the Resources page actually helped me a lot this week.", chat: group._id, readBy: [karan._id] },
  ]);
  group.latestMessage = msgs2[msgs2.length - 1]._id;
  await group.save();
  console.log("Created chats + messages");

  console.log("\nDemo accounts (all passwords: " + DEMO_PASSWORD + "):");
  for (const c of counsellorSpecs) console.log(`  counsellor: ${c.email}`);
  for (const s of studentSpecs) console.log(`  student:    ${s.email}${s.isVerified === false ? " (unverified)" : ""}`);

  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
