const fileInput = document.getElementById("fileInput");
const fileInfo = document.getElementById("fileInfo");
const statusBox = document.getElementById("statusBox");
const chatMessages = document.getElementById("chatMessages");

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (file) {
        fileInfo.textContent = `Selected file: ${file.name} (${file.size} bytes)`;
    }
});

function startAnalysis() {
    statusBox.classList.remove("hidden");
    statusBox.textContent = "Uploading file...";
    addSystemMessage("Uploading file...");

    setTimeout(() => addSystemMessage("Static analysis in progress..."), 1500);
    setTimeout(() => addSystemMessage("AI analysis in progress..."), 3000);
    setTimeout(() => addSystemMessage("Final report generated. High risk detected."), 4500);
}

function sendMessage() {
    const input = document.getElementById("chatInput");
    if (!input.value.trim()) return;
    addUserMessage(input.value);
    input.value = "";
    setTimeout(() => addSystemMessage("Response based on analysis results."), 800);
}

function addSystemMessage(msg) {
    const d = document.createElement("div");
    d.className = "system";
    d.textContent = "System: " + msg;
    chatMessages.appendChild(d);
}

function addUserMessage(msg) {
    const d = document.createElement("div");
    d.className = "user";
    d.textContent = "You: " + msg;
    chatMessages.appendChild(d);
}