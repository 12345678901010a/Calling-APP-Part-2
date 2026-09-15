const SUPABASE_URL = "https://supabase.co"; 
const SUPABASE_KEY = "sb_publishable_L2bIt4md08OvoEg0iqDaxg_DbjVEMCf";

const myId = "user_" + Math.random().toString(36).substring(2, 9);
let activePeerId = null;
let myNickname = "ChromebookUser";

// Local state caching systems
let friendsMap = JSON.parse(localStorage.getItem('chat_friends_list')) || {};
let messagesDatabase = JSON.parse(localStorage.getItem('chat_history_cache')) || {};

const myIdDisplay = document.getElementById('my-id');
const nicknameInput = document.getElementById('nickname-input');
const friendIdInput = document.getElementById('friend-id-input');
const addFriendBtn = document.getElementById('add-friend-btn');
const friendsListContainer = document.getElementById('friends-list');
const activeChatTitle = document.getElementById('active-chat-title');
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');

myIdDisplay.innerText = myId;
renderFriendsList();
logMessage('System', 'Welcome! Click Add Friend using your partner\'s User ID to connect.', 'system');

nicknameInput.addEventListener('input', () => {
    myNickname = nicknameInput.value.trim() || "ChromebookUser";
});

// Add Friend Logic
addFriendBtn.addEventListener('click', () => {
    const targetId = friendIdInput.value.trim();
    if (!targetId || targetId === myId) return;
    
    if (!friendsMap[targetId]) {
        friendsMap[targetId] = { id: targetId, name: "Friend (" + targetId.substring(5, 9) + ")" };
        localStorage.setItem('chat_friends_list', JSON.stringify(friendsMap));
        renderFriendsList();
    }
    friendIdInput.value = '';
    selectFriend(targetId);
});

function renderFriendsList() {
    friendsListContainer.innerHTML = '';
    Object.keys(friendsMap).forEach(id => {
        const item = document.createElement('div');
        item.classList.add('friend-item');
        if (id === activePeerId) item.classList.add('active');
        item.innerHTML = `<div class="status-dot"></div><span>${friendsMap[id].name}</span>`;
        item.addEventListener('click', () => selectFriend(id));
        friendsListContainer.appendChild(item);
    });
}

function selectFriend(id) {
    activePeerId = id;
    renderFriendsList();
    activeChatTitle.innerText = `# ${friendsMap[id].name}`;
    messageInput.disabled = false;
    messageInput.placeholder = `Message # ${friendsMap[id].name}`;
    
    // Send background greeting so they automatically add you back
    sendSignal(activePeerId, 'handshake', { name: myNickname });
    loadChatHistory(activePeerId);
}

// Data Package Handlers
async function sendSignal(receiver, type, payloadData) {
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/p2p_signals`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify([{
                sender_id: myId, receiver_id: receiver, type: type, payload: payloadData, created_at: new Date().toISOString()
            }])
        });
    } catch (e) { console.error("Network sync lag."); }
}

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const msg = messageInput.value.trim();
        if (!msg || !activePeerId) return;

        sendSignal(activePeerId, 'text', { text: msg, senderName: myNickname });
        saveAndRenderLocalMessage(activePeerId, myNickname, msg, 'me');
        messageInput.value = '';
    }
});

function saveAndRenderLocalMessage(peer, sender, text, type) {
    if (!messagesDatabase[peer]) messagesDatabase[peer] = [];
    messagesDatabase[peer].push({ sender, text, type });
    localStorage.setItem('chat_history_cache', JSON.stringify(messagesDatabase));
    
    if (peer === activePeerId) {
        logMessage(sender, text, type);
    }
}

function loadChatHistory(peer) {
    chatBox.innerHTML = '';
    if (messagesDatabase[peer]) {
        messagesDatabase[peer].forEach(m => logMessage(m.sender, m.text, m.type));
    }
}

// Global Polling Engine Framework
let lastCheckedTimestamp = new Date().toISOString();
setInterval(async () => {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/p2p_signals?receiver_id=eq.${myId}&order=created_at.desc&limit=10`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        });
        if (!res.ok) return;
        const rows = await res.json();
        const freshPackets = rows.filter(row => row.created_at > lastCheckedTimestamp).reverse();
        
        if (freshPackets.length > 0) {
            lastCheckedTimestamp = freshPackets[freshPackets.length - 1].created_at;
            
            freshPackets.forEach(packet => {
                const sender = packet.sender_id;
                
                // If an unknown user sends a message/handshake, add them to your friends interface automatically
                if (!friendsMap[sender]) {
                    const claimedName = packet.payload.name || packet.payload.senderName || "User";
                    friendsMap[sender] = { id: sender, name: `@${claimedName}` };
                    localStorage.setItem('chat_friends_list', JSON.stringify(friendsMap));
                    renderFriendsList();
                }

                if (packet.type === 'handshake') {
                    friendsMap[sender].name = `@${packet.payload.name}`;
                    localStorage.setItem('chat_friends_list', JSON.stringify(friendsMap));
                    renderFriendsList();
                } else if (packet.type === 'text') {
                    saveAndRenderLocalMessage(sender, friendsMap[sender].name, packet.payload.text, 'peer');
                }
            });
        }
    } catch (err) { console.log("Re-syncing nodes..."); }
}, 1500);

function logMessage(sender, text, type) {
    const msgEl = document.createElement('div');
    msgEl.classList.add('msg', type);
    msgEl.innerHTML = type === 'system' ? `${text}` : `<span class="sender-name">${sender}</span>${text}`;
    chatBox.appendChild(msgEl);
    chatBox.scrollTop = chatBox.scrollHeight;
}
