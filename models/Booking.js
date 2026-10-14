const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  consumer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  serviceDate: { type: Date, required: true },
  address: { type: String, required: true, trim: true, maxlength: 300 },
  notes: { type: String, trim: true, maxlength: 1000, default: "" },
  status: { type: String, enum: ["pending", "accepted", "cancelled", "completed"], default: "pending" }
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);
