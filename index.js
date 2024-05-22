import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import cors from "cors";
import multer from "multer";
import path from "path"
const app = express();
const port = 8000;

app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.urlencoded({ extended: true }));

mongoose.connect("mongodb://127.0.0.1:27017/resumeBuilder")
    .then(() => {
        console.log("MongoDB connected");
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    })
    .catch((error) => console.error("MongoDB connection error:", error));


// resumeData schema 

const dbSchema = new mongoose.Schema({


    details:
    {
        email: {
            type: String,
            required: true
        },
        image: {
            type: String,
        },
        name: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            required: true,

        },
        totalExp:
        {
            type: String,
            required: true,

        },
    },

    AboutMe:
    {
        message: {
            type: String,
            required: true,
        },

        pointers: {
            type: Array,

        },
    }
    ,
    SkillsProficiencies: {
        type: Array,
        required: true,
    },

    workExperience:

        [{
            clientDescription: {
                type: String,
                required: true,
            },
            country: {
                type: String,
                required: true,
            },
            projectName: {
                type: String,
                required: true,
            },
            roleWork: {
                type: String,
                required: true,
            },
            startDate: {
                type: String,
                required: true,
            },
            endDate: {
                type: String,
                required: true,
            },
            businessSolution: {
                type: String,
                required: true,
            },
            technologyStack: {
                type: [String],
                required: true,
            },
            projectResponsibility: {
                type: [String],
                required: true,
            },
        },]


})
// resumedata schema
const dbModel = mongoose.model("enquiry", dbSchema);

app.get("/", async (req, res) => {
    try {
        const data = await dbModel.find();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
});

// register schema
const registerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
});

// register schema
const RegisterModel = mongoose.model("Register", registerSchema);


// Multer 
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'resumeBuilder/')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + '-' + file.originalname)
    }
})

const upload = multer({ storage: storage })


app.post("/send", upload.single("image"), async (req, res) => {
    try {
        console.log("Request Body:", req.body); // Log request body
        console.log("File:", req.file); // Log uploaded file info

        const { dataSave } = req.body;

        if (!dataSave) {
            throw new Error("dataSave is missing");
        }

        // Parse the JSON string to a JavaScript object
        const parsedDataSave = JSON.parse(dataSave);
        console.log("Parsed DataSave:", parsedDataSave); // Log parsed data

        const { email, name, role, totalExp } = parsedDataSave.details;
        const { message, pointers } = parsedDataSave.AboutMe;
        const skillProficiencies = parsedDataSave.SkillsProficiencies;
        const workExperience = parsedDataSave.workExperience;
        const image = req.file ? req.file.path : "";
        console.log(image, "imageee")

        const dataToSave = new dbModel({
            details: { email, name, role, totalExp, image },
            AboutMe: { message, pointers },
            SkillsProficiencies: skillProficiencies,
            workExperience: workExperience
        });

        console.log("Data to Save:", dataToSave); // Log the data to save

        await dataToSave.save();
        res.status(200).json({ message: "Data saved successfully", dataToSave });
        console.log(dataToSave, "dataToSave")
    } catch (err) {
        console.error("Server Error:", err); // Log the error
        res.status(500).json({ message: "Server Error", error: err.message });
    }
});

app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userExists = await RegisterModel.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "Email already registered" });
        }
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        password = hashedPassword
        // Create new user
        const newUser = new RegisterModel({ name, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: "User registered successfully" });
        console.log(newUser)
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});


app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ message: "Enter email and password" });
        }

        const user = await RegisterModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        console.log("Plain text password:", password);
        console.log("Stored hash:", user.password);

        // Compare passwords
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: "Incorrect Password" });
        }

        // res.status(200).json({
        //     message: "Login successful",
        //     user: {
        //         email: user.email,
        //     },
        // });
        await user.save();
        res.status(200).json({ message: "Login successful" });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});


// backend se data frontend me lene ke liye 
app.get("/userData", async (req, res) => {
    const { email } = req.query;
    try {
        const user = await RegisterModel.findOne({ email });
        const resumeProfiles = await dbModel.find({ "details.email": email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user, resumeProfiles: resumeProfiles || [] });
        console.log(resumeProfiles, "resumeProfile")
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// delete one
app.delete("/delete/:id", async (req, res) => {
    try {
        const idToDelete = req.params.id;
        console.log("id", idToDelete);
        await dbModel.deleteOne({ _id: idToDelete });
        res.status(200).send("Successfully deleted");
    } catch (error) {
        console.error("error:", error);
        res.status(400).json({ message: error.message });
    }
});

// delete many
app.delete("/deleteMany", async (req, res) => {
    try {
        const { ids } = req.body;
        const result = await dbModel.deleteMany({ _id: { $in: ids } });
        res.status(200).json({ message: "Successfully deleted", result });
    } catch (error) {
        console.error("Error:", error);
        res.status(400).json({ message: error.message });
    }
});

app.get("/getById/:id", async (req, res) => {
    const idToGet = req.params.id;
    try {
        const resumeData = await dbModel.findOne({ _id: idToGet });
        const userData = await RegisterModel.findOne({ _id: idToGet });
        res.status(200).json({ resumeData, userData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

app.put("/update/:id", upload.single('image'), async (req, res) => {
    const idToUpdate = req.params.id;

    try {
        const dataSave = JSON.parse(req.body.dataSave);
        const editId = { _id: idToUpdate };

        // Update
        const options = { new: true };
        const updatedData = await dbModel.updateOne(editId, dataSave, options);

        res.status(200).json({ message: "Data updated successfully", updatedData });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});
