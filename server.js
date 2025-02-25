const express = require("express");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const fs = require("fs");

const app = express();
const port = process.env.PORT || 3000;

const apiId = 25842022;
const apiHash = "64477ef07db57ab4406c15106de4acfb";
const sessionFile = "sessionString.txt";

let sessionString = "";
if (fs.existsSync(sessionFile)) {
    sessionString = fs.readFileSync(sessionFile, "utf-8");
    console.log("Loaded session from", sessionFile);
} else {
    console.error(`Session file ${sessionFile} not found. Cannot proceed.`);
    process.exit(1);
}

const session = new StringSession(sessionString);
const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
});

// Function to list accessible chats
async function listDialogs() {
    try {
        const dialogs = await client.getDialogs();
        console.log("Accessible chats:");
        dialogs.forEach((dialog) => {
            console.log("Chat:", dialog.title, "ID:", dialog.id.toString());
        });
    } catch (error) {
        console.error("Error listing dialogs:", error.message);
    }
}

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
            console.log("Connecting Telegram client...");
            await client.connect();
            console.log("Client connected.");
            await listDialogs();
        } else {
            console.log("Client already connected.");
        }

        let entity;
        try {
            console.log("Resolving entity for:", groupName);
            entity = await client.getEntity(groupName);
        } catch (error) {
            if (error.errorMessage === "CHANNEL_PRIVATE") {
                throw new Error("The group is private, and this client is not a member.");
            }
            throw error;
        }

        console.log(`Fetching message from ${groupName} with topic ${topicId || "none"}`);
        const messages = await client.getMessages(entity, {
            limit: 1,
            thread: topicId ? Number(topicId) : undefined,
        });

        if (messages.length === 0) {
            return "No messages found in the group/topic.";
        }

        const lastMessage = messages[0];
        const messageText = lastMessage.message || "Message content unavailable";
        console.log("Fetched message:", messageText); // Log the raw message
        return cleanAndFormatPost(messageText);
    } catch (error) {
        console.error("Error fetching message:", error.message);
        throw error;
    }
}

app.post("/fetch-message", async (req, res) => {
    const { groupName, topicId } = req.body;
    console.log("Frontend inputs received - groupName:", groupName, "topicId:", topicId); // Log inputs explicitly

    if (!groupName) {
        console.log("Validation failed: groupName is missing");
        return res.status(400).json({ error: "groupName is required" });
    }

    try {
        const lastMessage = await fetchLastMessage(groupName, topicId);
        console.log("Sending response:", lastMessage); // Log the final response
        res.json({ message: lastMessage });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch message", details: err.message });
    }
});

app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
    try {
        await client.connect();
        console.log("Telegram client initialized at startup.");
        await listDialogs();
    } catch (error) {
        console.error("Failed to initialize Telegram client:", error.message);
    }
});
