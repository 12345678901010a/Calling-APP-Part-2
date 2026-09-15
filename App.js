// SUPABASE CREDENTIALS CONFIGURATION
const SUPABASE_URL = "https://epuorjlqocrlfqberngi.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_L2bIt4md08OvoEg0iqDaxg_DbjVEMCf";

// Initialize Supabase Engine Connection Client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Generate a random unblocked ID for yourself
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

// Display user session identification setup
myIdDisplay.innerText = myId;
logMessage('System', `Welcome! Signed in as session ID. Ready to receive signals.`, 'system');

nicknameInput.addEventListener('input', () => {
    myNickname = nicknameInput.value.trim() || "ChromebookUser";
});

// Connect to a friend using their randomly generated session ID
connectBtn.addEventListener('click', () => {
    const target = peerIdInput.value.trim();
    if (!target || target === myId) return;
    
    peerId = target;
    logMessage('System', `Connected to channel target session: ${peerId}`, 'system');
    
    // Announce username payload package
    sendSignal('name', { name: myNickname });
});

// Send messaging packet infrastructure using Supabase database insertions
async function sendSignal(type, payloadData) {
    if (!peerId) return;
    await supabaseClient.from('p2p_signals').insert([
        { sender_id: myId, receiver_id: peerId, type: type, payload: payloadData }
    ]);
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

// Listen live to data transmission using Supabase Realtime Channels Engine
supabaseClient
  .channel('public:p2p_signals')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'p2p_signals', filter: `receiver_id=eq.${myId}` }, (payload) => {
      const data = payload.new;
      peerId = data.sender_id; // Lock on connection automatically from sender packets
      
      if (data.type === 'name') {
          peerNickname = data.payload.name;
          logMessage('System', `@${peerNickname} joined your active terminal connection room.`, 'system');
      } else if (data.type === 'text') {
          logMessage(peerNickname, data.payload.text, 'peer');
      }
  })
  .subscribe();

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
