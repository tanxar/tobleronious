document.getElementById("fetchForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const groupName = document.getElementById("groupName").value;
    const topicId = document.getElementById("topicId").value;

    const response = await fetch("/fetch-message", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ groupName, topicId }),
    });

    const result = await response.json();

    if (result.message) {
        document.getElementById("messageOutput").textContent = result.message;
    } else if (result.error) {
        document.getElementById("messageOutput").textContent = `Error: ${result.error}`;
    }
});
