const express = require("express");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const fs = require("fs");
const readline = require("readline");

const app = express();
const port = process.env.PORT || 3000;

// API credentials
const apiId = 25842022; // Αντικατέστησε με το δικό σου API ID
const apiHash = "64477ef07db57ab4406c15106de4acfb"; // Αντικατέστησε με το δικό σου API Hash
const sessionFile = "sessionString.txt";

// Initialize Telegram client session
let sessionString = "";
if (fs.existsSync(sessionFile)) {
    sessionString = fs.readFileSync(sessionFile, "utf-8");
}
const session = new StringSession(sessionString);

const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
});

app.use(express.static("public"));
app.use(express.json());

// Function to clean and format the message
const cleanAndFormatPost = (originalMessage) => {
    let cleanedMessage = originalMessage;

    const quickActionsIndex = cleanedMessage.indexOf("Quick Actions");
    if (quickActionsIndex !== -1) {
        cleanedMessage = cleanedMessage.substring(0, quickActionsIndex).trim();
    }

    const tokenAddressRegex = /[a-zA-Z0-9]{32,44}/;
    const tokenAddressMatch = cleanedMessage.match(tokenAddressRegex);
    const tokenAddress = tokenAddressMatch ? tokenAddressMatch[0] : null;

    if (tokenAddress) {
        const formattedLink = `https://gmgn.ai/sol/token/PnI6fny6_${tokenAddress}`;
        return `⚡Act Fast⚡: ${formattedLink}\n${cleanedMessage}`;
    } else {
        console.warn("Token address not found in the message.");
        return cleanedMessage;
    }
};

// Function to fetch last message from Telegram
async function fetchLastMessage(groupName, topicId) {
    console.log("Connecting to Telegram...");
    await client.start({
        phoneNumber: async () => "+306980153019",
        password: async () => "zapre",
        phoneCode: async () => {
            console.log("Check your Telegram app for the login code.");
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
            const code = await new Promise((resolve) =>
                rl.question("Enter the login code you received: ", resolve)
            );
            rl.close();
            return code.trim();
        },
        onError: (err) => console.error("Authentication error:", err),
    });

    console.log("Connected to Telegram!");

    const chatEntity = await client.getEntity(groupName);
    const inputPeer = await client.getInputEntity(chatEntity);

    const messages = await client.getMessages(inputPeer, { limit: 2 });

    if (messages.length > 0) {
        const lastMessage = messages[0];
        const formattedText = cleanAndFormatPost(lastMessage.message);
        return formattedText;
    } else {
        return "No messages found in the group.";
    }
}

// Route to handle frontend requests
app.post("/fetch-message", async (req, res) => {
    const { groupName, topicId } = req.body;

    // Fetch the last message from the group
    try {
        const lastMessage = await fetchLastMessage(groupName, topicId);
        res.json({ message: lastMessage });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch message", details: err });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
