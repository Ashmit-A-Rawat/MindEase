import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  counsellorName: { type: String, required: true },
  counsellorEmail: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  mode: { type: String, required: true },
  meetingLink: { type: String },
  location: { type: String},
  // The frontend (AppointmentCard.jsx, MyAppointments.jsx on both roles)
  // filters/colors by Booked/Confirmed/Cancelled too, but the enum only ever
  // allowed Pending/Completed — cancelling an appointment crashed with a
  // validation error since "Cancelled" had nowhere to go.
  status: { type: String, default: "Pending", enum: ["Pending", "Booked", "Confirmed", "Completed", "Cancelled"] },
  // Populated live during the call from VideoCall.jsx's periodic emotion-service
  // captures (see server.js's "emotion-update" socket handler) — a timestamped
  // record of each participant's detected emotion, so a counsellor can review
  // where a student showed concerning affect after the session instead of only
  // seeing the live overlay in the moment.
  emotionLog: [{
    timestamp: { type: Date, default: Date.now },
    emotion: { type: String },
    confidence: { type: Number },
    participantRole: { type: String, enum: ["student", "counsellor"] },
  }],
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
