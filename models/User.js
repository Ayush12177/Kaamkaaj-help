const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8 },
  role: { type: String, enum: ["consumer", "provider"], required: true },
  phone: { type: String, trim: true, default: "" },
  city: { type: String, trim: true, default: "" },
  profession: { type: String, trim: true, default: "" },
  bio: { type: String, trim: true, maxlength: 600, default: "" },
  skills: [{ type: String, trim: true }],
  hourlyRate: { type: Number, min: 0, default: 0 },
  avatar: { type: String, default: "" },
  rating: { type: Number, min: 0, max: 5, default: 5 },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  try { this.password = await bcrypt.hash(this.password, 12); next(); }
  catch (err) { next(err); }
});
userSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};
module.exports = mongoose.model("User", userSchema);
