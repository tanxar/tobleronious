const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware για να διαβάζει JSON δεδομένα
app.use(bodyParser.json());

// Στατικά αρχεία από τον φάκελο "public"
app.use(express.static("public"));

// Route για να λαμβάνει δεδομένα από το frontend
app.post("/log-input", (req, res) => {
    const userInput = req.body.input;
    console.log(`User Input: ${userInput}`);
    res.json({ message: "Input received!" });
});

// Εκκίνηση του server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
