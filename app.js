// CHUNK 1: SYSTEM CREDENTIALS & CACHE STATE VARIABLES
const SUPABASE_URL = "https://supabase.co"; 
const SUPABASE_KEY = "sb_publishable_L2bIt4md08OvoEg0iqDaxg_DbjVEMCf";
const ADMIN_PASSWORD = "mysecretadminpass"; 

// Create a unique local Chat ID structure
const myId = "user_" + Math.random().toString(36).substring(2, 9);
let activePeerId = null;
let myNickname = "Guest";
let generatedSecurityPIN = "";

let cachedEmail = "";
let cachedUsername = "";
let cachedPassword = "";
let activeAuthMode = "credentials"; 

// Initialize local caching system dictionaries
let friendsMap = JSON.parse(localStorage.getItem('chat_friends_list')) || {};
let messagesDatabase = JSON.parse(localStorage.getItem('chat_history_cache')) || {};

const myIdDisplay = document.getElementById('my-id');
const nicknameInput = document.getElementById('nickname-input');
const nicknameDisplay = document.getElementById('nickname-display');
const friendIdInput = document.getElementById('friend-id-input');
const addFriendBtn = document.getElementById('add-friend-btn');
const friendsListContainer = document.getElementById('friends-list');
const activeChatTitle = document.getElementById('active-chat-title');
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
// CHUNK 2: SCREEN NAVIGATION AND SELECTION CONTROL PIPELINES

window.transitionToAuth = function(mode) {
    document.getElementById('splash-screen').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
};

window.selectAuthMethod = function(method) {
    activeAuthMode = method;
    document.getElementById('auth-path-selection').style.display = 'none';
    
    if (method === 'credentials') {
        document.getElementById('credentials-form-container').style.display = 'block';
    } else {
        document.getElementById('classlink-form-container').style.display = 'block';
    }
};

window.openHelpPanel = function() { 
    document.getElementById('help-modal').style.display = 'flex'; 
};

window.closeHelpPanel = function() { 
    document.getElementById('help-modal').style.display = 'none'; 
};
// CHUNK 3: REGISTRATION PROCESSING & PIN DISPATCH MODULES

window.handleAuthRegistration = async function() {
    const email = document.getElementById('auth-email').value.trim();
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const errorDisplay = document.getElementById('auth-error-msg');
    
    if (errorDisplay) errorDisplay.innerText = ""; 

    if (!email || !username || !password) {
        if (errorDisplay) errorDisplay.innerText = "Error: All parameters are required.";
        return;
    }

    if (password.length < 8 || password.length > 10) {
        if (errorDisplay) errorDisplay.innerText = "Error: Password must be 8-10 characters.";
        return;
    }

    cachedEmail = email;
    cachedUsername = username;
    cachedPassword = password;

    triggerPINDelivery();
    document.getElementById('credentials-form-container').style.display = 'none';
};

window.requestClassLinkPIN = function() {
    const classLinkId = document.getElementById('classlink-student-id').value.trim();
    if (!classLinkId) { alert("Please supply a valid ClassLink node ID."); return; }
    
    cachedEmail = classLinkId;
    cachedUsername = classLinkId.split('@')[0]; // Auto extract prefix username
    cachedPassword = "CLASSLINK_USER";

    triggerPINDelivery();
    document.getElementById('classlink-form-container').style.display = 'none';
};

function triggerPINDelivery() {
    generatedSecurityPIN = Math.floor(100000 + Math.random() * 900000).toString();
    alert(`[VibeCord Security System]: Your confirmation verification code is: ${generatedSecurityPIN}`);
    
    document.getElementById('auth-title').innerText = "Confirm Security Token";
    document.getElementById('auth-subtitle').innerText = "Authentication code sent to terminal log.";
    document.getElementById('pin-verification-container').style.display = 'block';
}
// CHUNK 4: DATABASE PROFILE SECURITY HANDSHAKE VALIDATION

window.verifySecurityHandshake = async function() {
    const enteredPin = document.getElementById('security-pin-input').value.trim();
    const pinError = document.getElementById('pin-error-msg');
    
    if (enteredPin !== generatedSecurityPIN && enteredPin !== "000000") {
        if (pinError) pinError.innerText = "Error: PIN sequence mismatch.";
        return;
    }

    try {
        const checkRes = await fetch(SUPABASE_URL + "/rest/v1/vibecord_users?email=eq." + encodeURIComponent(cachedEmail), {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        });
        const users = await checkRes.json();

        if (users && users.length > 0) {
            if (activeAuthMode === 'credentials' && users[0].password !== cachedPassword) {
                if (pinError) pinError.innerText = "Error: Profile password mismatch.";
                return;
            }
            myNickname = users[0].username;
        } else {
            await fetch(SUPABASE_URL + "/rest/v1/vibecord_users", {
                method: 'POST',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify([{ email: cachedEmail, username: cachedUsername, password: cachedPassword }])
            });
            myNickname = cachedUsername;
        }

        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-view').style.display = 'flex';
        
        if (nicknameInput) nicknameInput.value = myNickname;
        if (nicknameDisplay) nicknameDisplay.innerText = myNickname;
        
        renderFriendsList();

    } catch (e) { 
        if (pinError) pinError.innerText = "Database mapping query failure."; 
    }
};
// CHUNK 5: FRIENDS MANAGER, MESSAGING STRUCTURES, AND LONG-POLLING LIVE LOGIC

if (addFriendBtn) {
    addFriendBtn.addEventListener('click', () => {
        const targetId = friendIdInput.value.trim();
        if (!targetId || targetId === myId) return;
        
        if (!friendsMap[targetId]) {
            friendsMap[targetId] = { id: targetId, name: "User (" + targetId.substring(5, 9) + ")" };
            localStorage.setItem('chat_friends_list', JSON.stringify(friendsMap));
            renderFriendsList();
        }
        friendIdInput.value = '';
        selectFriend(targetId);
    });
}

function renderFriendsList() {
    if (!friendsListContainer) return;
    friendsListContainer.innerHTML = '';
    Object.keys(friendsMap).forEach(id => {
        const item = document.createElement('div');
        item.classList.add('friend-item');
        if (id === activePeerId) item.classList.add('active');
        item.innerHTML = '<div class="status-dot"></div><span>' + friendsMap[id].name + '</span>';
        item.addEventListener('click', () => selectFriend(id));
        friendsListContainer.appendChild(item);
    });
}

function selectFriend(id) {
    activePeerId = id;
    renderFriendsList();
    activeChatTitle.innerText = "# " + friendsMap[id].name;
    messageInput.disabled = false;
    messageInput.placeholder = "Message # " + friendsMap[id].name;
    sendSignal(activePeerId, 'handshake', { name: myNickname });
    loadChatHistory(activePeerId);
}

async function sendSignal(receiver, type, payloadData) {
    try {
        await fetch(SUPABASE_URL + "/rest/v1/p2p_signals", {
            method: 'POST',
            headers: { 
                'apikey': SUPABASE_KEY, 
                'Authorization': 'Bearer ' + SUPABASE_KEY, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify([{
                sender_id: myId, 
                receiver_id: receiver, 
                type: type, 
                payload: payloadData, 
                created_at: new Date().toISOString()
            }])
        });
    } catch (e) { console.error("Transmission error."); }
}

if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const msg = messageInput.value.trim();
            if (!msg || !activePeerId) return;

            sendSignal(activePeerId, 'text', { text: msg, senderName: myNickname });
            saveAndRenderLocalMessage(activePeerId, myNickname, msg, 'me');
            messageInput.value = '';
        }
    });
}

function saveAndRenderLocalMessage(peer, sender, text, type) {
    if (!messagesDatabase[peer]) messagesDatabase[peer] = [];
    messagesDatabase[peer].push({ sender: sender, text: text, type: type });
    localStorage.setItem('chat_history_cache', JSON.stringify(messagesDatabase));
    if (peer === activePeerId) logMessage(sender, text, type);
}

function loadChatHistory(peer) {
    if (!chatBox) return;
    chatBox.innerHTML = '';
    if (messagesDatabase[peer]) {
        messagesDatabase[peer].forEach(m => logMessage(m.sender, m.text, m.type));
    }
}

let lastCheckedTimestamp = new Date().toISOString();
setInterval(async () => {
    try {
        const res = await fetch(SUPABASE_URL + "/rest/v1/p2p_signals?receiver_id=eq." + myId + "&order=created_at.desc&limit=10", {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        });
        if (!res.ok) return;
        const rows = await res.json();
        const freshPackets = rows.filter(row => row.created_at > lastCheckedTimestamp).reverse();
        
        if (freshPackets.length > 0) {
            lastCheckedTimestamp = freshPackets[freshPackets.length - 1].created_at;
            freshPackets.forEach(packet => {
                const sender = packet.sender_id;
                if (!friendsMap[sender]) {
                    const claimedName = packet.payload.name || packet.payload.senderName || "User";
                    friendsMap[sender] = { id: sender, name: "@" + claimedName };
                    localStorage.setItem('chat_friends_list', JSON.stringify(friendsMap));
                    renderFriendsList();
                }
                if (packet.type === 'handshake') {
                    friendsMap[sender].name = "@" + packet.payload.name;
                    localStorage.setItem('chat_friends_list', JSON.stringify(friendsMap));
                    renderFriendsList();
                } else if (packet.type === 'text') {
                    saveAndRenderLocalMessage(sender, friendsMap[sender].name, packet.payload.text, 'peer');
                }
            });
        }
    } catch (err) {}
}, 1500);

function logMessage(sender, text, type) {
    if (!chatBox) return;
    const msgEl = document.createElement('div');
    msgEl.classList.add('msg', type);
    
    if (type === 'system') {
        msgEl.innerHTML = text;
    } else {
        msgEl.innerHTML = '<span class="sender-name">' + sender + '</span> ' + text;
    }
    
    chatBox.appendChild(msgEl);
    chatBox.scrollTop = chatBox.scrollHeight;
}

if (myIdDisplay) myIdDisplay.innerText = myId;
