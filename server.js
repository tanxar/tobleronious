const express = require("express");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const fs = require("fs");
const readline = require("readline");

const app = express();
const port = process.env.PORT || 3000;

// API credentials
const apiId = 25842022; // Your API ID
const apiHash = "64477ef07db57ab4406c15106de4acfb"; // Your API Hash
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
    try {
        // Ensure the client is connected
        if (!client.connected) {
            await client.start({
                phoneNumber: async () => "+306980153019", // Your phone number
                password: async () => "zapre", // Your password
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
            // Save session after successful login
            fs.writeFileSync(sessionFile, client.session.save());
            console.log("Session saved. You won’t need to authenticate again unless the session file is deleted.");
        }

        // Resolve the group entity by its name or username
        let entity;
        try {
            entity = await client.getEntity(groupName);
        } catch (error) {
            if (error.errorMessage === "CHANNEL_PRIVATE") {
                throw new Error("The group is private, and this client is not a member.");
            }
            throw error;
        }

        // Fetch the latest messages
        const messages = await client.getMessages(entity, {
            limit: 1, // Get only the most recent message
            thread: topicId ? Number(topicId) : undefined, // Filter by topic/thread if provided
        });

        if (messages.length === 0) {
            return "No messages found in the group/topic.";
        }

        const lastMessage = messages[0];
        const messageText = lastMessage.message || "Message content unavailable";

        return cleanAndFormatPost(messageText);
    } catch (error) {
        console.error("Error fetching message:", error.message);
        throw error;
    }
}

// Route to handle frontend requests
app.post("/fetch-message", async (req, res) => {
    const { groupName, topicId } = req.body;

    if (!groupName) {
        return res.status(400).json({ error: "groupName is required" });
    }

    try {
        const lastMessage = await fetchLastMessage(groupName, topicId);
        res.json({ message: lastMessage });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch message", details: err.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
