// SUPABASE CREDENTIALS CONFIGURATION
const SUPABASE_URL = "https://supabase.co"; 
const SUPABASE_KEY = "sb_publishable_L2bIt4md08OvoEg0iqDaxg_DbjVEMCf";

// Generate a random ID format instantly
const myId = "user_" + Math.random().toString(36).substring(2, 9);
let peerId = null;
let myNickname = "ChromebookUser";
let peerNickname = "Friend";

const myIdDisplay = document.getElementById('my-id');
const nicknameInput = document.getElementById('nickname-input');
const peerIdInput = document.getElementById('peer-id-input');
const connectBtn = document.getElementById('connect-btn');
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

// Force display the custom ID onto the terminal immediately
if (myIdDisplay) {
    myIdDisplay.innerText = myId;
}
logMessage('System', `Welcome! Signed in. Tunnel active.`, 'system');

nicknameInput.addEventListener('input', () => {
    myNickname = nicknameInput.value.trim() || "ChromebookUser";
});

connectBtn.addEventListener('click', () => {
    const target = peerIdInput.value.trim();
    if (!target || target === myId) return;
    
    peerId = target;
    logMessage('System', `Target set to: ${peerId}`, 'system');
    sendSignal('name', { name: myNickname });
});

// Database direct transmission interface 
async function sendSignal(type, payloadData) {
    if (!peerId) return;
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/p2p_signals`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{
                sender_id: myId,
                receiver_id: peerId,
                type: type,
                payload: payloadData,
                created_at: new Date().toISOString()
            }])
        });
    } catch (e) {
        console.error("Packet drop.");
    }
}

function triggerSend() {
    const msg = messageInput.value.trim();
    if (!msg || !peerId) return;

    sendSignal('text', { text: msg });
    logMessage(myNickname, msg, 'me');
    messageInput.value = '';
}

sendBtn.addEventListener('click', triggerSend);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') triggerSend();
});

// Realtime Fallback Long-Polling Engine Loops
let lastCheckedTimestamp = new Date().toISOString();
setInterval(async () => {
    try {
        const url = `${SUPABASE_URL}/rest/v1/p2p_signals?receiver_id=eq.${myId}&order=created_at.desc&limit=5`;
        const res = await fetch(url, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        });
        if (!res.ok) return;
        
        const rows = await res.json();
        if (!Array.isArray(rows)) return;
        
        const freshPackets = rows.filter(row => row.created_at > lastCheckedTimestamp).reverse();
        if (freshPackets.length > 0) {
            lastCheckedTimestamp = freshPackets[freshPackets.length - 1].created_at;
            
            for (const packet of freshPackets) {
                peerId = packet.sender_id;
                if (packet.type === 'name') {
                    peerNickname = packet.payload.name;
                    logMessage('System', `@${peerNickname} connected to your node.`, 'system');
                } else if (packet.type === 'text') {
                    logMessage(peerNickname, packet.payload.text, 'peer');
                }
            }
        }
    } catch (err) {
        console.warn("Sync refresh pending...");
    }
}, 1500);

function logMessage(sender, text, type) {
    if (!chatBox) return;
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
