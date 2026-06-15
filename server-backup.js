require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const app = express();

app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
console.log("MongoDB Connected Successfully");
})
.catch((err) => {
console.log("MongoDB Error:", err);
});

// User Schema
const UserSchema = new mongoose.Schema({
fullname: String,
email: String,
mobile: String,
aadhaar: String,
pan: String,
upi: String,
password: String
});

const User = mongoose.model("User", UserSchema);

// Pages
app.get("/", (req, res) => {
res.sendFile(__dirname + "/index.html");
});

app.get("/about", (req, res) => {
res.sendFile(__dirname + "/about.html");
});

app.get("/projects", (req, res) => {
res.sendFile(__dirname + "/projects.html");
});

app.get("/contact", (req, res) => {
res.sendFile(__dirname + "/contact.html");
});

app.get("/login", (req, res) => {
res.sendFile(__dirname + "/login.html");
});

app.get("/register", (req, res) => {
res.sendFile(__dirname + "/register.html");
});

app.get("/test", (req, res) => {
    res.send("TEST WORKING");
});

// Register User
app.post("/register", async (req, res) => {

try {

    const existingUser = await User.findOne({
        email: req.body.email
    });

    if (existingUser) {
        return res.send("Email already registered");
    }

    const hashedPassword = await bcrypt.hash(
        req.body.password,
        10
    );

    const newUser = new User({
        fullname: req.body.fullname,
        email: req.body.email,
        mobile: req.body.mobile,
        aadhaar: req.body.aadhaar,
        pan: req.body.pan,
        upi: req.body.upi,
        password: hashedPassword
    });

    await newUser.save();

    res.redirect("/login");

} catch (error) {

    console.log(error);
    res.send("Registration Failed");

}

});

// Login User
app.post("/login", async (req, res) => {

try {

    const user = await User.findOne({
        email: req.body.email
    });

    if (!user) {
        return res.send("User Not Found");
    }

    const match = await bcrypt.compare(
        req.body.password,
        user.password
    );

    if (!match) {
        return res.send("Wrong Password");
    }

    res.redirect("/dashboard.html");

} catch (error) {

    console.log(error);
    res.send("Login Failed");

}

});

app.post("/test", (req, res) => {
    res.send("TEST ROUTE WORKING");
});

app.listen(3000, () => {
console.log("Server Running On http://localhost:3000");
});

console.log("MY SERVER FILE LOADED");