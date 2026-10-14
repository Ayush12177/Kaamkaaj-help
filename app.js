require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const methodOverride = require("method-override");
const path = require("path");

const User = require("./models/User");
const Booking = require("./models/Booking");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kaamkaaj";

mongoose.set("strictQuery", true);
mongoose.connect(MONGODB_URI)
  .then(() => console.log("✓ Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection failed:", err.message));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
  name: "kaamkaaj.sid",
  secret: process.env.SESSION_SECRET || "development-only-change-this-secret",
  resave: false,
  saveUninitialized: false,
  store: process.env.MONGODB_URI ? MongoStore.create({ mongoUrl: MONGODB_URI, collectionName: "sessions" }) : undefined,
  cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use(async (req, res, next) => {
  res.locals.currentUser = null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  if (req.session.userId) {
    try {
      res.locals.currentUser = await User.findById(req.session.userId).select("-password");
      if (!res.locals.currentUser) delete req.session.userId;
    } catch (e) { delete req.session.userId; }
  }
  next();
});

function flash(req, type, message) { req.session.flash = { type, message }; }
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    flash(req, "error", "Please log in to continue.");
    return res.redirect("/login");
  }
  next();
}
function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.userId) {
      flash(req, "error", "Please log in to continue.");
      return res.redirect("/login");
    }
    User.findById(req.session.userId).then(user => {
      if (!user) { delete req.session.userId; return res.redirect("/login"); }
      if (user.role !== role) {
        flash(req, "error", "That page belongs to a different account type.");
        return res.redirect("/dashboard");
      }
      next();
    }).catch(next);
  };
}
function dashboardPath(user) {
  return user.role === "provider" ? "/provider-dashboard" : "/consumer-dashboard";
}

app.get("/", async (req, res, next) => {
  try {
    const providers = await User.find({ role: "provider", isAvailable: true })
      .select("name profession city bio skills hourlyRate avatar rating")
      .sort({ createdAt: -1 }).limit(6);
    res.render("home", { providers });
  } catch (e) { next(e); }
});

app.get("/register", (req, res) => res.render("auth/register"));
app.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role, phone, city, profession } = req.body;
    if (!name || !email || !password || !role) {
      flash(req, "error", "Please fill in all required fields.");
      return res.redirect("/register");
    }
    if (!["consumer", "provider"].includes(role)) {
      flash(req, "error", "Please select Consumer or Service Provider.");
      return res.redirect("/register");
    }
    if (password.length < 8) {
      flash(req, "error", "Password must contain at least 8 characters.");
      return res.redirect("/register");
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.findOne({ email: normalizedEmail })) {
      flash(req, "error", "An account with that email already exists.");
      return res.redirect("/register");
    }
    const user = await User.create({
      name: name.trim(), email: normalizedEmail, password,
      role, phone: phone || "", city: city || "",
      profession: role === "provider" ? (profession || "General services") : "",
      bio: "", skills: [], hourlyRate: 0
    });
    req.session.userId = user._id.toString();
    flash(req, "success", "Welcome to Kaamkaaj! Complete your profile when you're ready.");
    res.redirect("/profile");
  } catch (e) {
    if (e.code === 11000) { flash(req, "error", "That email is already registered."); return res.redirect("/register"); }
    next(e);
  }
});

app.get("/login", (req, res) => res.render("auth/login"));
app.post("/login", async (req, res, next) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(req.body.password || ""))) {
      flash(req, "error", "Email or password is incorrect.");
      return res.redirect("/login");
    }
    req.session.userId = user._id.toString();
    flash(req, "success", `Welcome back, ${user.name.split(" ")[0]}!`);
    res.redirect("/");
  } catch (e) { next(e); }
});
app.post("/logout", requireAuth, (req, res, next) => {
  req.session.destroy(err => {
    if (err) return next(err);
    res.clearCookie("kaamkaaj.sid");
    res.redirect("/");
  });
});

app.get("/dashboard", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/login");
    res.redirect(dashboardPath(user));
  } catch (e) { next(e); }
});

app.get("/consumer-dashboard", requireRole("consumer"), async (req, res, next) => {
  try {
    const bookings = await Booking.find({ consumer: req.session.userId })
      .populate("provider", "name profession city phone")
      .sort({ createdAt: -1 });
    const providerCount = await User.countDocuments({ role: "provider", isAvailable: true });
    res.render("dashboards/consumer", { bookings, providerCount });
  } catch (e) { next(e); }
});
app.get("/provider-dashboard", requireRole("provider"), async (req, res, next) => {
  try {
    const bookings = await Booking.find({ provider: req.session.userId })
      .populate("consumer", "name phone city")
      .sort({ createdAt: -1 });
    res.render("dashboards/provider", { bookings });
  } catch (e) { next(e); }
});

app.get("/profile", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/login");
    res.render(user.role === "provider" ? "profile/provider" : "profile/consumer", { profileUser: user });
  } catch (e) { next(e); }
});
app.post("/profile", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/login");
    const { name, phone, city, bio, profession, skills, hourlyRate, isAvailable } = req.body;
    user.name = (name || user.name).trim();
    user.phone = (phone || "").trim();
    user.city = (city || "").trim();
    if (user.role === "provider") {
      user.bio = (bio || "").trim();
      user.profession = (profession || "General services").trim();
      user.skills = (skills || "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 20);
      user.hourlyRate = Math.max(0, Number(hourlyRate) || 0);
      user.isAvailable = isAvailable === "on";
    }
    await user.save();
    flash(req, "success", "Your profile has been updated.");
    res.redirect("/profile");
  } catch (e) { next(e); }
});

app.get("/providers", async (req, res, next) => {
  try {
    const { q = "", city = "", profession = "" } = req.query;
    const filter = { role: "provider", isAvailable: true };
    if (city.trim()) filter.city = new RegExp(city.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (profession.trim()) filter.profession = new RegExp(profession.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (q.trim()) {
      const safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [{ name: new RegExp(safe, "i") }, { profession: new RegExp(safe, "i") }, { skills: new RegExp(safe, "i") }, { bio: new RegExp(safe, "i") }];
    }
    const providers = await User.find(filter).select("name profession city bio skills hourlyRate rating avatar isAvailable").sort({ rating: -1, createdAt: -1 });
    res.render("providers", { providers, filters: { q, city, profession } });
  } catch (e) { next(e); }
});
app.get("/providers/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).render("404");
    const provider = await User.findOne({ _id: req.params.id, role: "provider" }).select("-password");
    if (!provider) return res.status(404).render("404");
    res.render("provider-detail", { provider });
  } catch (e) { next(e); }
});

app.post("/bookings", requireRole("consumer"), async (req, res, next) => {
  try {
    const { providerId, serviceDate, serviceTime, address, notes } = req.body;
    if (!mongoose.isValidObjectId(providerId)) { flash(req, "error", "Please select a valid provider."); return res.redirect("/providers"); }
    const provider = await User.findOne({ _id: providerId, role: "provider", isAvailable: true });
    if (!provider) { flash(req, "error", "This provider is currently unavailable."); return res.redirect("/providers"); }
    if (!serviceDate || !serviceTime || !address) { flash(req, "error", "Date, time, and service address are required."); return res.redirect(`/providers/${providerId}`); }
    const date = new Date(`${serviceDate}T${serviceTime}`);
    if (Number.isNaN(date.getTime()) || date < new Date()) { flash(req, "error", "Choose a future date and time."); return res.redirect(`/providers/${providerId}`); }
    await Booking.create({
      consumer: req.session.userId, provider: provider._id,
      serviceDate: date, address: address.trim(), notes: (notes || "").trim()
    });
    flash(req, "success", "Booking request sent! You can track it from your dashboard.");
    res.redirect("/consumer-dashboard");
  } catch (e) { next(e); }
});
app.post("/bookings/:id/status", requireRole("provider"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.redirect("/provider-dashboard");
    const status = req.body.status;
    if (!["accepted", "cancelled", "completed"].includes(status)) {
      flash(req, "error", "Invalid booking status."); return res.redirect("/provider-dashboard");
    }
    const booking = await Booking.findOne({ _id: req.params.id, provider: req.session.userId });
    if (!booking) { flash(req, "error", "Booking not found."); return res.redirect("/provider-dashboard"); }
    if (booking.status === "completed" || booking.status === "cancelled") {
      flash(req, "error", "This booking is already closed."); return res.redirect("/provider-dashboard");
    }
    booking.status = status;
    await booking.save();
    flash(req, "success", `Booking marked ${status}.`);
    res.redirect("/provider-dashboard");
  } catch (e) { next(e); }
});

app.use((req, res) => res.status(404).render("404"));
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).render("500", { errorMessage: process.env.NODE_ENV === "development" ? err.message : "Please try again in a moment." });
});

app.listen(PORT, () => console.log(`Kaamkaaj running at http://localhost:${PORT}`));
