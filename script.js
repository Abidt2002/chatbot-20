document.addEventListener("DOMContentLoaded", () => {
  const CSV_FILENAME = "DevBay_Chatbot_QA.csv"; // place in same folder
  let qaData = [];

  const chatIcon = document.getElementById("chat-icon");
  const chatContainer = document.getElementById("devbay-chat");
  const closeBtn = document.getElementById("close-chat");
  const chatBox = document.getElementById("chat-box");
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");

  const normalize = s => (s||"").toLowerCase().trim();

  // OPEN / CLOSE CHAT with slide + pop animation
  const openChat = () => {
    chatContainer.classList.add("chat-visible");
    chatContainer.style.transform = "translateY(20px) scale(1.05)";
    setTimeout(() => { chatContainer.style.transform = "translateY(0) scale(1)"; }, 50);
    userInput.focus();
    if(chatBox.children.length===0) showBotMessage("👋 Hi — I'm the DevBay Assistant. Ask me anything about DevBay!");
  };

  const closeChat = () => chatContainer.classList.remove("chat-visible");
  chatIcon.addEventListener("click", openChat);
  closeBtn.addEventListener("click", closeChat);

  // Load CSV
  async function loadCsv() {
    try {
      const res = await fetch(CSV_FILENAME, {cache:"no-store"});
      if(!res.ok) throw new Error("CSV not found");
      const text = await res.text();
      parseCSV(text);
    } catch(e) {
      console.error("Failed to load CSV:", e);
      showBotMessage("⚠️ Failed to load Q&A data from CSV.");
    }
  }

  // Robust CSV parser
  function parseCSV(text) {
    const rows = [];
    let cur="", col=[], inQuotes=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i];
      if(ch==='"' && text[i+1]==='"'){ cur+='"'; i++; continue; }
      if(ch==='"'){ inQuotes=!inQuotes; continue; }
      if(ch===',' && !inQuotes){ col.push(cur); cur=""; continue; }
      if((ch==='\n'||ch==='\r') && !inQuotes){
        col.push(cur); rows.push(col); col=[]; cur="";
        if(ch==='\r' && text[i+1]==='\n') i++; continue;
      }
      cur+=ch;
    }
    if(cur||col.length){ col.push(cur); rows.push(col); }

    if(rows.length<2) return;
    const header = rows[0].map(h=>(h||"").toLowerCase());
    const qIdx = header.findIndex(h=>h.includes("question")) || 0;
    const aIdx = header.findIndex(h=>h.includes("answer")) || 1;
    for(let i=1;i<rows.length;i++){
      const r=rows[i]; if(!r) continue;
      qaData.push({ question: normalize(r[qIdx]), answer: r[aIdx]||"" });
    }
  }

  function findAnswer(q){
    q=normalize(q);
    const exact = qaData.find(e=>e.question===q);
    if(exact) return exact.answer;
    return "🤖 Sorry, I couldn't find a matching answer. Try rephrasing your question.";
  }

  // Typing indicator
  function showTyping() {
    const t = document.createElement("div");
    t.className = "typing";
    t.id = "__typing";
    t.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    chatBox.appendChild(t);
    chatBox.scrollTop = chatBox.scrollHeight;
    return t;
  }

  function hideTyping() {
    const t = document.getElementById("__typing");
    if(t) t.remove();
  }

  // Character-by-character typing
  async function typeBotCharByChar(text) {
    const msg = document.createElement("div");
    msg.className = "message bot";
    chatBox.appendChild(msg);

    for (let char of text) {
      msg.innerHTML += char;
      chatBox.scrollTop = chatBox.scrollHeight;
      await new Promise(r => setTimeout(r, 30)); // 30ms per character, like ChatGPT
    }
  }

  // Show bot message with typing indicator
  async function showBotMessage(text){
    const typingEl = showTyping();
    await new Promise(r => setTimeout(r, 500)); // initial "thinking" delay
    hideTyping();
    await typeBotCharByChar(text);
  }

  // Handle user input
  async function handleSend(){
    const text = userInput.value.trim();
    if(!text) return;

    const userMsg = document.createElement("div");
    userMsg.className = "message user";
    userMsg.textContent = text;
    chatBox.appendChild(userMsg);
    chatBox.scrollTop = chatBox.scrollHeight;

    userInput.value = "";
    const ans = findAnswer(text);
    await showBotMessage(ans);
  }

  sendBtn.addEventListener("click", handleSend);
  userInput.addEventListener("keydown", e => { if(e.key==="Enter") handleSend(); });

  loadCsv();
});
