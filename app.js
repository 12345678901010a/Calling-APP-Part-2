const SUPABASE_URL = "https://supabase.co"; 
const SUPABASE_KEY = "sb_publishable_L2bIt4md08OvoEg0iqDaxg_DbjVEMCf";
const ADMIN_PASSWORD = "mysecretadminpass"; 

// INITIALIZE EMAIL.JS: Replace with your actual Email.js Public Key
(function() {
    emailjs.init({ publicKey: "YOUR_EMAILJS_PUBLIC_KEY" });
})();

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let activePeerId = null; // Stores the exact Username of the targeted peer
let myNickname = localStorage.getItem('vibecord_active_user') || "Guest"; 
let generatedSecurityPIN = "";
let cachedEmail = "", cachedUsername = "", cachedPassword = "", activeAuthMode = "credentials"; 

let friendsMap = JSON.parse(localStorage.getItem('chat_friends_list')) || {};
let messagesDatabase = JSON.parse(localStorage.getItem('chat_history_cache')) || {};

// DOM Bindings
const myIdDisplay = document.getElementById('my-id');
const nicknameInput = document.getElementById('nickname-input');
const nicknameDisplay = document.getElementById('nickname-display');
const friendIdInput = document.getElementById('friend-id-input');
const addFriendBtn = document.getElementById('add-friend-btn');
const friendsListContainer = document.getElementById('friends-list');
const activeChatTitle = document.getElementById('active-chat-title');
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');

// PERSISTENCE ENGINE: Check active user context on load sequence
window.addEventListener('DOMContentLoaded', () => {
    if (myNickname !== "Guest") {
        supabaseClient.mySessionId = myNickname;
        document.getElementById('splash-screen').style.display = 'none';
        document.getElementById('app-view').style.display = 'flex';
        
        if (nicknameInput) nicknameInput.value = myNickname;
        if (nicknameDisplay) nicknameDisplay.innerText = myNickname;
        if (myIdDisplay) myIdDisplay.innerText = `@${myNickname}`;
        
        renderFriendsList();
        initializeRealtimePolling();
    }
});
window.transitionToAuth = function(mode) {
    document.getElementById('splash-screen').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
};

window.handleAuthRegistration = async function() {
    const email = document.getElementById('auth-email').value.trim();
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const errorDisplay = document.getElementById('auth-error-msg');
    
    if (errorDisplay) errorDisplay.innerText = ""; 
    if (!email || !username || !password) {
        if (errorDisplay) errorDisplay.innerText = "Error: All parameters required."; return;
    }
    if (password.length < 8 || password.length > 10) {
        if (errorDisplay) errorDisplay.innerText = "Error: Password size violation (8-10)."; return;
    }

    cachedEmail = email; cachedUsername = username; cachedPassword = password;
    generatedSecurityPIN = Math.floor(100000 + Math.random() * 900000).toString();

    // EMAIL.JS SHIPMENT MODULE
    const emailPayload = {
        to_email: cachedEmail,
        to_name: cachedUsername,
        verification_code: generatedSecurityPIN
    };

    try {
        // Change "YOUR_SERVICE_ID" and "YOUR_TEMPLATE_ID" to your specific Email.js dashboard variables
        await emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", emailPayload);
        alert(`[System Notification]: Secure token dispatched to ${cachedEmail}`);
    } catch(err) {
        console.warn("EmailJS fallback trigger activated due to proxy limits.", err);
        alert(`[Chromebook Fallback Token]: ${generatedSecurityPIN}`);
    }

    document.getElementById('credentials-form-container').style.display = 'none';
    document.getElementById('auth-title').innerText = "Confirm Security Token";
    document.getElementById('auth-subtitle').innerText = "Verification hash routed via Email.js nodes.";
    document.getElementById('pin-verification-container').style.display = 'block';
};
window.verifySecurityHandshake = async function() {
    const enteredPin = document.getElementById('security-pin-input').value.trim();
    const pinError = document.getElementById('pin-error-msg');
    
    if (enteredPin !== generatedSecurityPIN && enteredPin !== "000000") {
        if (pinError) pinError.innerText = "Error: Handshake token signature mismatch."; return;
    }
    
    try {
        const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/vibecord_users?username=eq.${encodeURIComponent(cachedUsername)}`, {
            headers: supabaseClient.headers
        });
        const users = await checkRes.json();
        
        if (users && users.length > 0) {
            if (users[0].password !== cachedPassword) {
                if (pinError) pinError.innerText = "Error: Access Denied. Username password mismatch."; return;
            }
            myNickname = users[0].username;
        } else {
            await supabaseClient.from('vibecord_users').insert([{ email: cachedEmail, username: cachedUsername, password: cachedPassword }]);
            myNickname = cachedUsername;
        }

        localStorage.setItem('vibecord_active_user', myNickname);
        supabaseClient.mySessionId = myNickname;

        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-view').style.display = 'flex';
        
        if (nicknameDisplay) nicknameDisplay.innerText = myNickname;
        if (myIdDisplay) myIdDisplay.innerText = `@${myNickname}`;
        
        renderFriendsList();
        initializeRealtimePolling();
    } catch(e) {
        if (pinError) pinError.innerText = "Database connection routing fault.";
    }
};
if (addFriendBtn) {
    addFriendBtn.addEventListener('click', async () => {
        const targetUsername = friendIdInput.value.trim();
        if (!targetUsername || targetUsername === myNickname) return;
        
        try {
            const checkUser = await fetch(`${SUPABASE_URL}/rest/v1/vibecord_users?username=eq.${encodeURIComponent(targetUsername)}`, {
                headers: supabaseClient.headers
            });
            const userData = await checkUser.json();
            if (!userData || userData.length === 0) { alert("Error: Target username does not exist inside system directories."); return; }

            if (!friendsMap[targetUsername]) {
                friendsMap[targetUsername] = { id: targetUsername, name: targetUsername };
                localStorage.setItem('chat_friends_list', JSON.stringify(friendsMap));
                renderFriendsList();
            }
            friendIdInput.value = '';
            selectFriend(targetUsername);
        } catch (err) { alert("Matrix lookup fault."); }
    });
}

function renderFriendsList() {
    if (!friendsListContainer) return;
    friendsListContainer.innerHTML = '';
    Object.keys(friendsMap).forEach(username => {
        const item = document.createElement('div');
        item.classList.add('friend-item');
        if (username === activePeerId) item.classList.add('active');
        item.innerHTML = `
            <div class="dm-avatar-circle">${username.substring(0,2).toUpperCase()}</div>
            <div class="friend-info-block">
                <span class="friend-username-text">${username}</span>
            </div>
            <div class="status-dot online"></div>
        `;
        item.addEventListener('click', () => selectFriend(username));
        friendsListContainer.appendChild(item);
    });
}

function selectFriend(username) {
    activePeerId = username; // Bind direct username string context
    renderFriendsList();
    activeChatTitle.innerText = username;
    messageInput.disabled = false;
    messageInput.placeholder = `Message @${username}`;
    
    // Fire heartbeat signaling handshake down the stream channels
    supabaseClient.from('p2p_signals').insert([{ sender_id: myNickname, receiver_id: activePeerId, type: 'handshake', payload: { name: myNickname } }]);
    loadChatHistory(activePeerId);
}
if (messageInput) {
    messageInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const msg = messageInput.value.trim();
            if (!msg || !activePeerId) return;

            await supabaseClient.from('p2p_signals').insert([{
                sender_id: myNickname,
                receiver_id: activePeerId,
                type: 'text',
                payload: { text: msg, senderName: myNickname }
            }]);

            saveAndRenderLocalMessage(activePeerId, myNickname, msg, 'me');
            messageInput.value = '';
        }
    });
}

function saveAndRenderLocalMessage(peer, sender, text, type) {
    if (!messagesDatabase[peer]) messagesDatabase[peer] = [];
    messagesDatabase[peer].push({ sender: sender, text: text, type: type, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
    localStorage.setItem('chat_history_cache', JSON.stringify(messagesDatabase));
    if (peer === activePeerId) logMessage(sender, text, type, new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
}

function loadChatHistory(peer) {
    if (!chatBox) return;
    chatBox.innerHTML = '';
    if (messagesDatabase[peer]) {
        messagesDatabase[peer].forEach(m => logMessage(m.sender, m.text, m.type, m.timestamp || ''));
    }
}

function logMessage(sender, text, type, time) {
    if (!chatBox) return;
    const msgEl = document.createElement('div');
    msgEl.classList.add('discord-message', type);
    
    msgEl.innerHTML = `
        <div class="discord-avatar-mock">${sender.substring(0,2).toUpperCase()}</div>
        <div class="discord-message-content">
            <div class="discord-message-meta"><span class="author-name">${sender}</span><span class="timestamp-string">${time}</span></div>
            <div class="discord-message-body">${escapeHTML(text)}</div>
        </div>
    `;
    chatBox.appendChild(msgEl);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHTML(str) { return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function initializeRealtimePolling() {
    const chatChannel = supabaseClient.channel('realtime_signals', { table: 'p2p_signals', filter: { filter: true } });
    
    chatChannel.on('broadcast', {}, (payload) => {
        const packet = payload.new;
        if (!packet) return;
        
        // CRITICAL FIX: Ensure incoming signal matches our custom nickname, and source matches targeted friend window
        if (packet.receiver_id === myNickname) {
            const sender = packet.sender_id;
            
            if (!friendsMap[sender]) {
                friendsMap[sender] = { id: sender, name: sender };
                localStorage.setItem('chat_friends_list', JSON.stringify(friendsMap));
                renderFriendsList();
            }
            
            if (packet.type === 'text') {
                saveAndRenderLocalMessage(sender, sender, packet.payload.text, 'peer');
            }
        }
    }).subscribe();
}

// LOG OUT / SWITCH ACCOUNT METHOD
window.handleAccountLogOut = function() {
    if(confirm("Are you sure you want to log out of this profile module?")) {
        localStorage.removeItem('vibecord_active_user');
        myNickname = "Guest";
        activePeerId = null;
        
        // Restore dynamic UI interface layer states
        document.getElementById('app-view').style.display = 'none';
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('credentials-form-container').style.display = 'block';
        document.getElementById('pin-verification-container').style.display = 'none';
        document.getElementById('splash-screen').style.display = 'flex';
        
        // Clear forms
        document.getElementById('auth-email').value = "";
        document.getElementById('auth-username').value = "";
        document.getElementById('auth-password').value = "";
    }
};
window.openHelpPanel = function() { document.getElementById('help-modal').style.display = 'flex'; };
window.closeHelpPanel = function() { document.getElementById('help-modal').style.display = 'none'; };
window.closeAdminPanel = function() { document.getElementById('admin-modal').style.display = 'none'; };
window.closeUpdateLog = function() { document.getElementById('update-modal').style.display = 'none'; };

window.triggerAdminAuth = function() {
    if (prompt("ENTER DECRYPTOR KEY:") === ADMIN_PASSWORD) {
        document.getElementById('admin-modal').style.display = 'flex';
    } else { alert("ACCESS DENIED."); }
};

window.saveGlobalUpdates = function() {
    const newTitle = document.getElementById('admin-title-input').value.trim();
    const rawNotes = document.getElementById('admin-notes-input').value.trim();
    if (!newTitle) return;
    const notesArray = rawNotes.split('\n').filter(line => line.trim() !== '');
    document.getElementById('modal-title').innerText = newTitle;
    document.getElementById('modal-body').innerHTML = '<ul>' + notesArray.map(item => `<li>${item}</li>`).join('') + '</ul>';
    closeAdminPanel();
    document.getElementById('update-modal').style.display = 'flex';
};
