let chatbotHistory = [];
let isChatbotLoading = false;

// Open or close panel
function toggleChatbotOverlay(flag) {
    const p = document.getElementById("chatbot-panel");
    if (!p) return;
    if (flag) {
        p.classList.remove("hidden");
        p.classList.add("flex");
    } else {
        p.classList.add("hidden");
    }
}

// Send user message to GPT/Gemini on Flask
async function sendChatbotMessage() {
    const input = document.getElementById("chatbot-user-input");
    const msg = input.value.trim();
    if (!msg || isChatbotLoading) return;

    input.value = "";
    isChatbotLoading = true;

    // Plot user dialog
    appendChatMessage("user", msg);

    try {
        const resp = await fetch("/api/chatbot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg, history: chatbotHistory })
        });

        const data = await resp.json();
        if (resp.ok) {
            appendChatMessage("model", data.reply);
            
            // Keep history limits
            chatbotHistory.push({ role: "user", parts: [{ text: msg }] });
            chatbotHistory.push({ role: "model", parts: [{ text: data.reply }] });
            if (chatbotHistory.length > 10) {
                chatbotHistory.shift();
                chatbotHistory.shift();
            }
        } else {
            appendChatMessage("model", "Quelque chose s'est déréglé. Contactez le support direct de DataBroker229 🇧🇯 par WhatsApp : +229 55256871");
        }
    } catch (err) {
        appendChatMessage("model", "Erreur réseau. N'hésitez pas à nous joindre en direct sur WhatsApp au +229 55256871 !");
    } finally {
        isChatbotLoading = false;
    }
}

// Draw list lines
function appendChatMessage(sender, text) {
    const container = document.getElementById("chatbot-messages-box");
    if (!container) return;

    let html = "";
    if (sender === 'user') {
        html = `
            <div class="bg-emerald-600 text-slate-900 border rounded-2xl p-2.5 max-w-[85%] self-end ml-auto leading-relaxed font-bold font-sans">
                ${text}
            </div>
        `;
    } else {
        // Regex parse links and WhatsApp bold texts for beauty
        let parsedText = text.replace(/wa\.me\/229(\d+)/g, '<a href="https://wa.me/229$1" target="_blank" class="underline font-black text-emerald-600">wa.me/229$1</a>');
        parsedText = parsedText.replace(/\+229\s?61\s?00\s?00\s?01/g, '<b>+229 61 00 00 01</b>');
        parsedText = parsedText.replace(/Des données terrain fiables, partout au Bénin/g, '<i>"Des données terrain fiables, partout au Bénin."</i>');

        html = `
            <div class="bg-white border rounded-2xl p-2.5 max-w-[85%] self-start mr-auto leading-relaxed text-slate-700">
                ${parsedText}
            </div>
        `;
    }

    container.innerHTML += html;
    
    // Auto Scroll to bottom
    container.scrollTop = container.scrollHeight;
}
