(function () {
  const vscode = acquireVsCodeApi();

  const messagesDiv = document.getElementById("messages");
  const chatInput = document.getElementById("chat-input");
  const sendButton = document.getElementById("send-button");
  let loading = false;

  const textarea = document.getElementById("chat-input");

  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  });

  marked.setOptions({
    highlight: function (code, lang) {
      if (hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  });

  function addMessage(role, content) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", role);

    const markdownHTML = marked.parse(content);
    messageElement.innerHTML = markdownHTML;

    messagesDiv.appendChild(messageElement);
    hljs.highlightAll();
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function removeLastMessage() {
    if (messagesDiv.lastChild) {
      messagesDiv.removeChild(messagesDiv.lastChild);
    }
  }

  function addLoadingMessage() {
    const loadingElement = document.createElement("div");
    loadingElement.classList.add("message", "assistant", "loading");
    loadingElement.innerHTML = `<div class="loader"></div>`;
    loadingElement.id = "loading-message";
    messagesDiv.appendChild(loadingElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    sendButton.disabled = true;
    loading = true;
  }

  function removeLoadingMessage() {
    const loading = document.getElementById("loading-message");
    if (loading) {
      loading.remove();
    }
    sendButton.disabled = false;
    loading = false;
  }

  sendButton.addEventListener("click", () => {
    const content = chatInput.value.trim();
    if (content) {
      vscode.postMessage({
        command: "sendMessage",
        content,
      });
      chatInput.value = "";
      addMessage("user", content);
      addLoadingMessage();
    }
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();
      sendButton.click();
    }
  });

  window.addEventListener("message", (e) => {
    const message = e.data;
    switch (message.command) {
      case "addMessage":
        addMessage(message.role, message.content);
        removeLoadingMessage();
        break;
      case "removeLastMessage":
        removeLastMessage();
        break;
    }
  });

  window.addEventListener("error", (e) => {
    removeLoadingMessage();
  });

  document
    .getElementById("open-vscode-settings")
    .addEventListener("click", () => {
      vscode.postMessage({ command: "openSettings" });
    });
})();
