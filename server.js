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
// Function to fetch last message from Telegram
async function fetchLastMessage(groupName, topicId) {
    try {
        // Ensure the client is connected
        if (!client.connected) {
            await client.start({
                phoneNumber: async () =>
                    await new Promise((resolve) =>
                        readline.question("Please enter your phone number: ", resolve)
                    ),
                password: async () =>
                    await new Promise((resolve) =>
                        readline.question("Please enter your password: ", resolve)
                    ),
                phoneCode: async () =>
                    await new Promise((resolve) =>
                        readline.question("Please enter the code you received: ", resolve)
                    ),
                onError: (err) => console.log(err),
            });
            // Save session after successful login
            fs.writeFileSync(sessionFile, client.session.save());
        }

        // Resolve the group entity by its name or username
        const entity = await client.getEntity(groupName);

        // Fetch the latest messages (limit to 1 for the last message)
        const messages = await client.getMessages(entity, {
            limit: 1, // Get only the most recent message
            thread: topicId ? Number(topicId) : undefined, // Filter by topic/thread if provided
        });

        if (messages.length === 0) {
            return "No messages found in the group/topic.";
        }

        const lastMessage = messages[0];
        const messageText = lastMessage.message || "Message content unavailable";

        // Clean and format the message
        return cleanAndFormatPost(messageText);
    } catch (error) {
        console.error("Error fetching message:", error);
        throw error; // Let the caller handle the error
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
