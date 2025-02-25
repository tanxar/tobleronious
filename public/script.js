function sendInput() {
    const input = document.getElementById("userInput").value;

    fetch("/log-input", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ input: input })
    })
    .then(response => response.json())
    .then(data => console.log(data.message))
    .catch(error => console.error("Error:", error));
}
