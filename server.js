require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

console.log("EMAIL_USER =", process.env.EMAIL_USER);
console.log("EMAIL_PASS =", process.env.EMAIL_PASS);

const ADMIN_EMAIL = "visheshofc@gmail.com";

const app = express();

app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: "worksphere_secret_key_2026",
    resave: false,
    saveUninitialized: false
}));

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
  fullName: String,

  email: {
    type: String,
    unique: true
  },

  mobile: {
    type: String,
    unique: true
  },

  aadhaar: String,

  pan: String,

  upi: String,

  password: String,

  role: {
    type: String,
    default: "user"
  },

  emailVerified: {
    type: Boolean,
    default: false
  },

  mobileVerified: {
    type: Boolean,
    default: false
  },

  verificationToken: String,

  wallet: {
    type: Number,
    default: 0
  }
});

const AdminSchema = new mongoose.Schema({

    email: String,

    password: String

});

const Admin = mongoose.model(
    "Admin",
    AdminSchema
);

const ApplicationSchema = new mongoose.Schema({
    userId: String,

    projectName: String,

    status: {
        type: String,
        default: "Pending"
    },

    appliedAt: {
        type: Date,
        default: Date.now
    }
});

const Application = mongoose.model(
    "Application",
    ApplicationSchema
);

const UploadSchema = new mongoose.Schema({

    userId: String,

    projectName: String,

    fileName: String,

    uploadDate: {
        type: Date,
        default: Date.now
    }

});

const WithdrawalSchema = new mongoose.Schema({

    userId: String,

    amount: Number,

    upi: String,

    status: {
        type: String,
        default: "Pending"
    },

    requestDate: {
        type: Date,
        default: Date.now
    }

});

const Withdrawal = mongoose.model(
    "Withdrawal",
    WithdrawalSchema
);

const Upload = mongoose.model(
    "Upload",
    UploadSchema
);

const User = mongoose.model("User", UserSchema);

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },

    filename: function (req, file, cb) {

        cb(
            null,
            Date.now() + "-" + file.originalname
        );

    }

});

const upload = multer({
    storage: storage
});

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

app.get("/admin-login", (req, res) => {

    res.sendFile(
        __dirname + "/admin-login.html"
    );

});

app.get("/dashboard", (req, res) => {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    res.sendFile(__dirname + "/dashboard.html");

});

app.get("/dashboard-data", async (req, res) => {

    if (!req.session.userId) {
        return res.json({ error: "Login Required" });
    }

    try {

        const totalTasks =
            await Application.countDocuments({
                userId: req.session.userId
            });

        const approvedTasks =
            await Application.countDocuments({
                userId: req.session.userId,
                status: "Approved"
            });

        const pendingTasks =
            await Application.countDocuments({
                userId: req.session.userId,
                status: "Pending"
            });

        const rejectedTasks =
            await Application.countDocuments({
                userId: req.session.userId,
                status: "Rejected"
            });

            const user = await User.findById(
    req.session.userId
);

       res.json({
    userName: req.session.userName,
    totalTasks,
    approvedTasks,
    pendingTasks,
    rejectedTasks,
    wallet: user.wallet
});

    } catch (error) {

        console.log(error);
        res.json({ error: "Server Error" });

    }

});

app.get("/api/user-role", (req, res) => {

    res.json({
        role: req.session.role || "user"
    });

});

app.get("/mytasks", (req, res) => {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    res.sendFile(__dirname + "/mytasks.html");

});

app.get("/profile", (req, res) => {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    res.sendFile(__dirname + "/profile.html");

});

app.get("/upload", (req, res) => {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    res.sendFile(__dirname + "/upload.html");

});

app.get("/withdraw", (req, res) => {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    res.sendFile(
        __dirname + "/withdraw.html"
    );

});

app.get("/my-withdrawals", (req, res) => {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    res.sendFile(
        __dirname + "/my-withdrawals.html"
    );

});

app.get("/earnings", (req, res) => {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    res.sendFile(
        __dirname + "/earnings.html"
    );

});

app.get("/support",(req,res)=>{

if(!req.session.userId){
return res.redirect("/login");
}

res.sendFile(__dirname + "/support.html");

});

app.get("/tasks", (req, res) => {

if(!req.session.userId){
return res.redirect("/login");
}

res.sendFile(__dirname + "/mytasks.html");

});

app.get("/test", (req, res) => {
    res.send("TEST WORKING");
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

// Register User
app.post("/register", async (req, res) => {

try {

    const existingUser = await User.findOne({
        email: req.body.email
    });

    console.log("Checking Email:", req.body.email);
    console.log("Existing User:", existingUser);

    if (existingUser) {
        return res.send("Email already registered");
    }

const token = crypto.randomBytes(32).toString("hex");

    const hashedPassword = await bcrypt.hash(
        req.body.password,
        10
    );

    const newUser = new User({
        fullName: req.body.fullname,
        email: req.body.email,
        mobile: req.body.mobile,
        aadhaar: req.body.aadhaar,
        pan: req.body.pan,
        upi: req.body.upi,
        password: hashedPassword,

        verificationToken: token,

        role: req.body.email === ADMIN_EMAIL
        ? "admin"
        : "user"
    });

    await newUser.save();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

console.log("Before SMTP Verify");

try {
    //await transporter.verify();
    //console.log("SMTP Connected");
} catch (err) {
    console.log("SMTP ERROR:", err);
}

const verificationLink =
`https://worksphereindia.onrender.com/verify-email/${token}`;

console.log("Before Send Mail");

try {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: req.body.email,
        subject: "Verify Your WorkSphere Account",
        html: `
        <h2>Verify Email</h2>
        <a href="${verificationLink}">Verify Account</a>
        `
    });

    console.log("After Send Mail");

} catch (err) {
    console.log("SEND MAIL ERROR:", err);
}

res.send(
    "Registration successful. Check your email for verification link."
);

} catch (error) {

    console.log(error);
    res.send("Registration Failed");

}

});

app.get("/verify-email/:token", async (req, res) => {

    const user = await User.findOne({
        verificationToken: req.params.token
    });

    if (!user) {
        return res.send("Invalid verification link");
    }

    user.emailVerified = true;
    user.verificationToken = "";

    await user.save();

    res.send(
        "Email verified successfully. You can now login."
    );

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

    if (!user.emailVerified) {
    return res.send(
        "Please verify your email first."
    );
}

    req.session.userId = user._id;
req.session.userName = user.fullName;
req.session.role = user.role;

res.redirect("/dashboard");

} catch (error) {

    console.log(error);
    res.send("Login Failed");

}

});

app.get("/verify-email/:token", async (req, res) => {

    try {

        const user = await User.findOne({
            verificationToken: req.params.token
        });

        if (!user) {
            return res.send("Invalid Verification Link");
        }

        user.emailVerified = true;
        user.verificationToken = "";

        await user.save();

        res.send(`
            <h2>Email Verified Successfully</h2>
            <a href="/login">Click Here To Login</a>
        `);

    } catch (error) {

        console.log(error);
        res.send("Verification Failed");

    }

});

app.post("/admin-login", async (req, res) => {

    const admin =
        await Admin.findOne({

            email: req.body.email

        });

    if (!admin) {

        return res.send(
            "Admin Not Found"
        );

    }

    const match =
        await bcrypt.compare(

            req.body.password,

            admin.password

        );

    if (!match) {

        return res.send(
            "Wrong Password"
        );

    }

    req.session.adminId =
        admin._id;

    res.redirect("/admin");

});

app.post("/apply", async (req, res) => {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    try {

        const application =
            new Application({

                userId:
                    req.session.userId,

                projectName:
                    req.body.projectName

            });

        await application.save();

        res.send(
            "Project Applied Successfully"
        );

    } catch (error) {

        console.log(error);

        res.send(
            "Application Failed"
        );

    }

});

app.post(
    "/upload",
    upload.single("workfile"),

    async (req, res) => {

        try {

            const newUpload =
                new Upload({

                    userId:
                        req.session.userId,

                    projectName:
                        req.body.projectName,

                    fileName:
                        req.file.filename

                });

            await newUpload.save();

            res.send(
                "Work Uploaded Successfully"
            );

        } catch (error) {

            console.log(error);

            res.send(
                "Upload Failed"
            );

        }

    }
);

app.get("/api/mytasks", async (req, res) => {

    if (!req.session.userId) {
        return res.json([]);
    }

    const tasks = await Application.find({
        userId: req.session.userId
    });

    res.json(tasks);

});

app.get("/api/profile", async (req, res) => {

    if (!req.session.userId) {
        return res.json({});
    }

    const user = await User.findById(
        req.session.userId
    );

    res.json(user);

});

app.post("/test", (req, res) => {
    res.send("TEST ROUTE WORKING");
});

app.get("/admin", (req, res) => {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    if (req.session.role !== "admin") {
        return res.send("Access Denied");
    }

    res.sendFile(__dirname + "/admin.html");

});

app.get("/api/admin/applications", async (req, res) => {

    const applications =
        await Application.find();

    res.json(applications);

});

app.get("/api/admin/uploads", async (req, res) => {

    const uploads =
        await Upload.find();

    res.json(uploads);

});

app.get("/api/admin/withdrawals", async (req, res) => {

    const withdrawals =
        await Withdrawal.find();

    res.json(withdrawals);

});

app.get("/download/:filename", (req, res) => {

    const filePath =
        path.join(
            __dirname,
            "uploads",
            req.params.filename
        );

    res.download(filePath);

});

app.post("/approve/:id", async (req, res) => {

    const application =
        await Application.findById(
            req.params.id
        );

    await Application.findByIdAndUpdate(
        req.params.id,
        {
            status: "Approved"
        }
    );

    await User.findByIdAndUpdate(
        application.userId,
        {
            $inc: {
                wallet: 500
            }
        }
    );

    res.redirect("/admin");

});

app.post("/reject/:id", async (req, res) => {

    await Application.findByIdAndUpdate(
        req.params.id,
        {
            status: "Rejected"
        }
    );

    res.redirect("/admin");

});


app.get("/admin-logout", (req, res) => {

    req.session.destroy(() => {

        res.redirect("/login");

    });

});

app.post("/withdraw", async (req, res) => {

    if (!req.session.userId) {
        return res.redirect("/login");
    }

    try {

        const user = await User.findById(
            req.session.userId
        );

        if (user.wallet < req.body.amount) {

            return res.send(
                "Insufficient Balance"
            );

        }

        const withdrawal =
            new Withdrawal({

                userId: req.session.userId,

                amount: req.body.amount,

                upi: req.body.upi

            });

        await withdrawal.save();

        res.send(
            "Withdrawal Request Submitted Successfully"
        );

    } catch (error) {

        console.log(error);

        res.send(
            "Withdrawal Failed"
        );

    }

});

app.post(
"/withdraw-approve/:id",

async (req, res) => {

    const withdrawal =
        await Withdrawal.findById(
            req.params.id
        );

    const user =
        await User.findById(
            withdrawal.userId
        );

    user.wallet =
        user.wallet - withdrawal.amount;

    await user.save();

    withdrawal.status =
        "Approved";

    await withdrawal.save();

    res.redirect("/admin");

});

app.post(
"/withdraw-reject/:id",

async (req, res) => {

    await Withdrawal.findByIdAndUpdate(

        req.params.id,

        {
            status: "Rejected"
        }

    );

    res.redirect("/admin");

});

app.get("/api/my-withdrawals", async (req, res) => {

    if (!req.session.userId) {
        return res.json([]);
    }

    const withdrawals = await Withdrawal.find({

        userId: req.session.userId

    });

    res.json(withdrawals);

});

app.get("/api/earnings", async (req, res) => {

    if (!req.session.userId) {
        return res.json({});
    }

    const user =
        await User.findById(
            req.session.userId
        );

    const withdrawals =
        await Withdrawal.find({
            userId: req.session.userId,
            status: "Approved"
        });

    let totalWithdrawn = 0;

    withdrawals.forEach(w => {
        totalWithdrawn += w.amount;
    });

    res.json({

        wallet:
            user.wallet || 0,

        totalEarned:
            (user.wallet || 0) +
            totalWithdrawn,

        totalWithdrawn:
            totalWithdrawn

    });

});

app.listen(3000, () => {
console.log("Server Running On http://localhost:3000");
});

console.log("MY SERVER FILE LOADED");