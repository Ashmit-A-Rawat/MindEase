import Slot from "../models/Slot.js";

// Create Slot
export const createSlot = async (req, res) => {
  try {
    // fullName is only ever set via Google OAuth signup — local email/password
    // signup leaves it unset, which used to make counsellorName undefined and
    // fail Slot's required-field validation, silently breaking slot creation
    // for any counsellor who didn't sign up with Google.
    const obj = req.body ?
    {...req.body,
      counsellorName: req.user.fullName || req.user.username,
      counsellorEmail: req.user.email} : null;
    const slot = new Slot(obj);
    await slot.save();
    res.status(201).json(slot);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Slots
export const getSlots = async (req, res) => {
  try {
    const slots = await Slot.find();
    res.json(slots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Slot
export const updateSlot = async (req, res) => {
  try {
    const slot = await Slot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(slot);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Slot
export const deleteSlot = async (req, res) => {
  try {
    await Slot.findByIdAndDelete(req.params.id);
    res.json({ message: "Slot deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
