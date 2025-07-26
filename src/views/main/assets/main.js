(function () {
  const vscode = acquireVsCodeApi();

  document
    .getElementById("open-vscode-settings")
    .addEventListener("click", () => {
      vscode.postMessage({ command: "openSettings" });
    });

  const messagesDiv = document.getElementById("messages");
  const chatInput = document.getElementById("chat-input");
  const sendButton = document.getElementById("send-button");

  function addMessage(sender, text) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", sender);
    messageElement.textContent = text;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function removeLastMessage() {
    if (messagesDiv.lastChild) {
      messagesDiv.removeChild(messagesDiv.lastChild);
    }
  }

  sendButton.addEventListener("click", () => {
    const text = chatInput.value.trim();
    if (text) {
      vscode.postMessage({
        command: "sendMessage",
        text: text,
      });
      chatInput.value = "";
      addMessage("user", text);
    }
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendButton.click();
    }
  });

  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.command) {
      case "addMessage":
        addMessage(message.sender, message.text);
        break;
      case "removeLastMessage":
        removeLastMessage();
        break;
    }
  });
})();
