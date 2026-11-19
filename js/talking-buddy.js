(function () {
    "use strict";

    const unsafePatterns = [
        /\b(hate|kill|hurt|weapon|violent|blood|sex|porn|drugs?)\b/i,
        /\b(address|password|phone number|school name)\b/i
    ];

    const responses = [
        {
            pattern: /\b(hello|hi|hey)\b/i,
            answer: "Hi! I’m Buddy. It’s lovely to chat with you. What would you like to explore?"
        },
        {
            pattern: /\b(story|stories|imagine)\b/i,
            answer: "Stories are magical! We could imagine a forest, a friendly robot or a journey to space."
        },
        {
            pattern: /\b(science|planet|space|animal|nature)\b/i,
            answer: "That is a great topic. I wonder what you would discover if you were a scientist or explorer!"
        },
        {
            pattern: /\b(math|numbers|count|quiz)\b/i,
            answer: "Numbers can be fun puzzles. Try counting five things near you, then tell me what you found."
        },
        {
            pattern: /\b(sad|worried|angry|upset)\b/i,
            answer: "I’m glad you told me. Take one slow breath, and talk to a trusted grown-up if you need support."
        },
        {
            pattern: /\b(favourite|favorite|like)\b/i,
            answer: "It sounds special to you. What makes it your favourite?"
        },
        {
            pattern: /\b(thank|thanks)\b/i,
            answer: "You’re welcome! I’m always happy to learn and chat with you."
        }
    ];

    let conversation = [];
    let currentConversationId = null;

    function loadConversation() {
        const data = window.SmartGrowStorage.getData();
        const latest = data.talkingBuddyConversations
            .slice()
            .reverse()
            .find(item => item.messages && item.messages.length);
        conversation = latest ? latest.messages.map(message => ({ ...message })) : [];
        currentConversationId = latest ? latest.id : null;
    }

    function containsUnsafeContent(text) {
        return unsafePatterns.some(pattern => pattern.test(text));
    }

    function getResponse(message) {
        const match = responses.find(item => item.pattern.test(message));
        if (match) return match.answer;
        return "That is interesting! Tell me one more detail, or choose a suggested topic to keep exploring.";
    }

    function saveConversation() {
        if (!conversation.length) return;

        const data = window.SmartGrowStorage.getData();
        const existingIndex = data.talkingBuddyConversations.findIndex(item =>
            item.id === currentConversationId
        );
        const isNewConversation = existingIndex < 0;
        const record = {
            id: currentConversationId || `buddy-${Date.now()}`,
            messages: conversation.map(message => ({ ...message })),
            createdAt: isNewConversation
                ? new Date().toISOString()
                : data.talkingBuddyConversations[existingIndex].createdAt,
            updatedAt: new Date().toISOString()
        };
        currentConversationId = record.id;

        if (isNewConversation) {
            window.SmartGrowStorage.updateArray("talkingBuddyConversations", record);
            window.SmartGrowStorage.updateData("learningProgress.talkingBuddy", value => {
                const progress = value && typeof value === "object" ? value : {};
                progress.completed = Number(progress.completed || 0) + 1;
                progress.updatedAt = new Date().toISOString();
                return progress;
            });
        } else {
            window.SmartGrowStorage.updateArray(
                "talkingBuddyConversations",
                record,
                existingIndex
            );
        }

        const historyCount = window.SmartGrowStorage.getData().talkingBuddyConversations.length;
        const achievements = window.SmartGrowStorage.getData().achievements;
        if (isNewConversation && historyCount === 1 && !achievements.some(item => item.id === "first-chat")) {
            window.SmartGrowStorage.updateArray("achievements", {
                id: "first-chat",
                title: "Friendly Chat",
                icon: "🤖",
                earnedAt: new Date().toISOString()
            });
            window.SmartGrowApp.notify("Achievement unlocked: Friendly Chat! 🤖", "success");
        }
    }

    function renderChat() {
        const body = document.createElement("div");
        body.className = "chat-panel";
        body.innerHTML = `
            <div class="suggested-topics" aria-label="Suggested conversation topics">
                <button type="button" data-topic="Tell me about space">🚀 Space</button>
                <button type="button" data-topic="I want to hear a story">📖 Stories</button>
                <button type="button" data-topic="Let's practice math">🔢 Math</button>
                <button type="button" data-topic="How do I care for nature">🌱 Nature</button>
            </div>
            <div class="chat-history" id="chatHistory" role="log" aria-live="polite"></div>
            <p id="buddyError" class="module-feedback feedback-error" role="alert" hidden></p>
            <form class="chat-form" id="chatForm">
                <label class="visually-hidden" for="chatInput">Message Talking Buddy</label>
                <input id="chatInput" type="text" maxlength="300" placeholder="Type a friendly message..." autocomplete="off">
                <button type="submit" class="generate-btn">Send</button>
            </form>
            <div class="module-actions">
                <button type="button" class="generate-btn secondary-btn" id="clearBuddyChat">Clear Conversation</button>
                <button type="button" class="generate-btn secondary-btn" id="viewBuddyHistory">View Chat History</button>
            </div>
        `;

        window.SmartGrowApp.openModal({
            title: "Talking Buddy",
            description: "A kind, child-friendly chat companion.",
            body
        });

        const historyElement = body.querySelector("#chatHistory");
        conversation.forEach(message => appendMessage(historyElement, message));

        body.querySelectorAll("[data-topic]").forEach(button => {
            button.addEventListener("click", () => sendMessage(button.dataset.topic));
        });
        body.querySelector("#chatForm").addEventListener("submit", event => {
            event.preventDefault();
            sendMessage(body.querySelector("#chatInput").value);
        });
        body.querySelector("#clearBuddyChat").addEventListener("click", clearChat);
        body.querySelector("#viewBuddyHistory").addEventListener("click", showHistory);
    }

    function appendMessage(container, message) {
        if (!container) return;
        const bubble = document.createElement("div");
        bubble.className = `chat-bubble chat-${message.role}`;
        bubble.textContent = message.text;
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
    }

    function sendMessage(text) {
        const input = document.getElementById("chatInput");
        const error = document.getElementById("buddyError");
        const history = document.getElementById("chatHistory");
        const message = String(text || "").trim();
        if (!message) {
            error.textContent = "Type a message for Buddy.";
            error.hidden = false;
            if (input) input.focus();
            return;
        }
        if (message.length > 300) {
            error.textContent = "Please keep your message under 300 characters.";
            error.hidden = false;
            return;
        }
        if (containsUnsafeContent(message)) {
            error.textContent = "Let’s keep the conversation kind and private. Please don’t share personal information.";
            error.hidden = false;
            conversation.push({
                role: "user",
                text: message,
                timestamp: new Date().toISOString()
            });
            appendMessage(history, conversation[conversation.length - 1]);
            if (input) input.value = "";
            return;
        }

        error.hidden = true;
        if (input) input.value = "";
        const userMessage = { role: "user", text: message, timestamp: new Date().toISOString() };
        conversation.push(userMessage);
        appendMessage(history, userMessage);

        const buddyMessage = {
            role: "buddy",
            text: getResponse(message),
            timestamp: new Date().toISOString()
        };
        conversation.push(buddyMessage);
        appendMessage(history, buddyMessage);
        saveConversation();
        if (conversation.filter(item => item.role === "user").length === 1) {
            window.SmartGrowStorage.updateData("activityHistory", activityHistory => [
                ...(Array.isArray(activityHistory) ? activityHistory : []),
                {
                    id: `activity-${Date.now()}`,
                    module: "talking-buddy",
                    title: "Talking Buddy conversation",
                    completedAt: new Date().toISOString()
                }
            ]);
        }
    }

    function clearChat() {
        if (currentConversationId) {
            const data = window.SmartGrowStorage.getData();
            window.SmartGrowStorage.updateData("talkingBuddyConversations", conversations =>
                (Array.isArray(conversations) ? conversations : [])
                    .filter(item => item.id !== currentConversationId)
            );
        }
        conversation = [];
        currentConversationId = null;
        const history = document.getElementById("chatHistory");
        if (history) history.replaceChildren();
        window.SmartGrowApp.notify("Conversation cleared.", "success");
    }

    function showHistory() {
        const data = window.SmartGrowStorage.getData();
        const sessions = data.talkingBuddyConversations.slice().reverse();
        const body = document.createElement("div");
        body.className = "module-list";
        if (!sessions.length) {
            body.innerHTML = "<p>No saved Buddy conversations yet.</p>";
        } else {
            sessions.forEach(session => {
                const card = document.createElement("article");
                card.className = "module-card";
                const count = session.messages ? session.messages.length : 0;
                card.innerHTML = `
                    <div>
                        <h3>Chat with Buddy</h3>
                        <p>${count} messages</p>
                        <small>${window.SmartGrowApp.formatDate(session.createdAt)}</small>
                    </div>
                `;
                body.appendChild(card);
            });
        }
        window.SmartGrowApp.openModal({
            title: "Chat History",
            description: `${sessions.length} saved conversation${sessions.length === 1 ? "" : "s"}`,
            body
        });
    }

    function open() {
        loadConversation();
        renderChat();
    }

    window.SmartGrowTalkingBuddy = { open };
})();
