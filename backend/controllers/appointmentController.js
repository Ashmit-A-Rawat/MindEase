import Appointment from "../models/Appointment.js";
import Slot from "../models/Slot.js";
import User from "../models/User.js"; // added
import { sendEmail } from "../utils/sendEmail.js";

// Book Appointment
export const bookAppointment = async (req, res) => {
  try {
    const { slotId, studentId } = req.body;

    // Fetch student from User collection
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(400).json({ message: "Invalid student" });
    }

    const slot = await Slot.findById(slotId);
    if (!slot || slot.isBooked) return res.status(400).json({ message: "Slot not available" });

    slot.isBooked = true;
    await slot.save();

    const appointment = new Appointment({
      // fullName is only ever set via Google OAuth signup — local
      // email/password students never have it, which used to fail
      // Appointment's required-field validation on booking. Same fix
      // already applied to slotController.js's counsellorName.
      studentName: student.fullName || student.username,
      studentEmail: student.email,
      counsellorName: slot.counsellorName,
      counsellorEmail: slot.counsellorEmail,
      date: slot.date,
      time: slot.time,
      mode: slot.mode,
      meetingLink: slot.meetingLink,
      location: slot.location
    });
    await appointment.save();

    // Confirmation emails are a best-effort side effect, not part of the
    // booking transaction — the slot and appointment are already committed
    // above, so a failure here (e.g. EMAIL_USER/EMAIL_PASS unset, or Gmail
    // rejecting the connection) must not turn a successful booking into a
    // 500 response. Previously this whole function shared one try/catch,
    // so a Nodemailer error here silently booked the slot but told the
    // student booking had failed.
    try {
      await sendEmail({
        to: student.email,
        subject: "Your Appointment is Confirmed",
        text: `Hi ${student.fullName},

Your appointment with ${slot.counsellorName} has been successfully confirmed.

Appointment Details:
- Date: ${slot.date}
- Time: ${slot.time}
- Mode: ${slot.mode}
- Meeting Link: ${slot.meetingLink}
- Location: ${slot.location}

Please make sure to join on time.

Thank you!
MindEase Team`
      });

      await sendEmail({
        to: slot.counsellorEmail,
        subject: "New Appointment Booked",
        text: `Hi ${slot.counsellorName},

A new appointment has been booked by ${student.fullName}.

Appointment Details:
- Student Email: ${student.email}
- Date: ${slot.date}
- Time: ${slot.time}
- Mode: ${slot.mode}
- Meeting Link: ${slot.meetingLink}
- Location: ${slot.location}

Please make sure to be available.

MindEase Team`
      });
    } catch (emailError) {
      console.error("Booking confirmation email failed (booking still succeeded):", emailError.message);
    }

    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Appointments
export const getAppointments = async (req, res) => {
  try {
    const { studentId, counsellorId } = req.params;

    if (studentId) {
      const student = await User.findById(studentId);
      if (!student || student.role !== "student") {
        return res.status(404).json({ message: "Student not found" });
      }
      const appointments = await Appointment.find({ studentEmail: student.email });
      return res.json(appointments);
    }

    if (counsellorId) {
      const counsellor = await User.findById(counsellorId);
      if (!counsellor || counsellor.role !== "counsellor") {
        return res.status(404).json({ message: "Counsellor not found" });
      }
      const appointments = await Appointment.find({ counsellorEmail: counsellor.email });
      return res.json(appointments);
    }

    res.status(400).json({ message: "Provide studentId or counsellorId" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Appointment Status
export const updateAppointmentStatus = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
