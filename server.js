const express = require("express");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Api } = require("telegram/tl");
const fs = require("fs");
const readline = require("readline");

const app = express();
const port = process.env.PORT || 3000;

// API credentials
const apiId = 25842022;
const apiHash = "64477ef07db57ab4406c15106de4acfb";
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
            fs.writeFileSync(sessionFile, client.session.save());
        }

        let entity;
        try {
            entity = await client.getEntity(groupName);
        } catch (error) {
            if (error.errorMessage === "CHANNEL_PRIVATE") {
                throw new Error("The group is private, and this client is not a member.");
            }
            throw error;
        }

        const messages = await client.getMessages(entity, {
            limit: 1,
            thread: topicId ? Number(topicId) : undefined,
        });

        if (messages.length === 0) {
            return "No messages found in the group/topic.";
        }

        const lastMessage = messages[0];
        const messageText = lastMessage.message || "Message content unavailable";

        return cleanAndFormatPost(messageText);
    } catch (error) {
        console.error("Error fetching message:", error);
        throw error;
    }
}

// Route to handle frontend requests
app.post("/fetch-message", async (req, res) => {
    const { groupName, topicId } = req.body;

    try {
        const lastMessage = await fetchLastMessage(groupName, topicId);
        res.json({ message: lastMessage });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch message", details: err.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
