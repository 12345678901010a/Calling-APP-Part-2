const peer = new Peer();
let conn = null;
let myNickname = "ChromebookUser";

const myIdDisplay = document.getElementById('my-id');
const nicknameInput = document.getElementById('nickname-input');
const peerIdInput = document.getElementById('peer-id-input');
const connectBtn = document.getElementById('connect-btn');
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

// Update your custom username locally when changed
nicknameInput.addEventListener('input', () => {
    myNickname = nicknameInput.value.trim() || "ChromebookUser";
});

peer.on('open', (id) => {
    myIdDisplay.innerText = id;
    logMessage('System', 'Welcome to the server. Ready for connections.', 'system');
});

peer.on('connection', (incomingConn) => {
    conn = incomingConn;
    setupChat();
});

connectBtn.addEventListener('click', () => {
    const peerId = peerIdInput.value.trim();
    if (!peerId) return;
    
    logMessage('System', 'Attempting connection...', 'system');
    conn = peer.connect(peerId);
    setupChat();
});

function setupChat() {
    conn.on('open', () => {
        logMessage('System', 'User connected to the channel.', 'system');
        messageInput.disabled = false;
        sendBtn.disabled = false;
        
        // Share username automatically when connected
        conn.send({ type: 'name', value: myNickname });
    });

    conn.on('data', (data) => {
        // Handle metadata configuration vs text messages
        if (data && data.type === 'name') {
            conn.peerNickname = data.value;
            logMessage('System', `Friend changed nickname to @${data.value}`, 'system');
        } else if (data && data.type === 'text') {
            const displaySender = conn.peerNickname || "Friend";
            logMessage(displaySender, data.value, 'peer');
        }
    });

    conn.on('close', () => {
        logMessage('System', 'User disconnected from the channel.', 'system');
        messageInput.disabled = true;
        sendBtn.disabled = true;
    });
}

function triggerSend() {
    const msg = messageInput.value.trim();
    if (!msg || !conn) return;

    // Send formatted structured text object to carry metadata
    conn.send({ type: 'text', value: msg });
    logMessage(myNickname, msg, 'me');
    messageInput.value = '';
}

sendBtn.addEventListener('click', triggerSend);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') triggerSend();
});

function logMessage(sender, text, type) {
    const msgEl = document.createElement('div');
    msgEl.classList.add('msg', type);
    
    if (type === 'system') {
        msgEl.innerHTML = `${text}`;
    } else {
        msgEl.innerHTML = `<span class="sender-name">@${sender}</span>${text}`;
    }
    
    chatBox.appendChild(msgEl);
    chatBox.scrollTop = chatBox.scrollHeight;
}
