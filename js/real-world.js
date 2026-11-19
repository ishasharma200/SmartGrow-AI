(function () {
    "use strict";

    const activities = [
        { id: "nature-walk", category: "Nature", title: "Five-Minute Nature Walk", icon: "🌿", instructions: "Step outside safely with a grown-up. Find five green things and describe their shapes.", reward: "Nature Explorer" },
        { id: "kindness-note", category: "Kindness", title: "Write a Kindness Note", icon: "💌", instructions: "Write or draw one kind message for someone in your family.", reward: "Kind Heart" },
        { id: "color-hunt", category: "Creative", title: "Colour Hunt", icon: "🎨", instructions: "Find one red, blue, yellow and green object around you.", reward: "Colour Detective" },
        { id: "stretch-break", category: "Movement", title: "Stretch and Balance", icon: "🤸", instructions: "Reach high, touch the floor and hold a balance for five seconds.", reward: "Movement Hero" },
        { id: "helper-mission", category: "Home", title: "Little Helping Mission", icon: "🏡", instructions: "Ask a grown-up for one safe, simple chore you can help with.", reward: "Helpful Human" },
        { id: "observation-journal", category: "Science", title: "Make an Observation", icon: "🔎", instructions: "Watch a plant, pet or cloud for three minutes and record one interesting detail.", reward: "Curious Scientist" }
    ];

    function todayKey() {
        const date = new Date();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function completedToday(data) {
        return data.completedRealWorldActivities.filter(item =>
            item && (item.completedAt || "").startsWith(todayKey())
        );
    }

    function renderActivities() {
        const data = window.SmartGrowStorage.getData();
        const today = completedToday(data);
        const body = document.createElement("div");
        body.className = "module-panel";
        body.innerHTML = `
            <div class="daily-challenge">
                <span>🌞 Today's offline progress</span>
                <strong>${today.length} / ${activities.length} activities</strong>
            </div>
            <div class="activity-grid"></div>
            <div class="module-actions">
                <button type="button" class="generate-btn secondary-btn" id="viewRealWorldHistory">Activity History</button>
            </div>
        `;
        const grid = body.querySelector(".activity-grid");
        activities.forEach(activity => {
            const completed = data.completedRealWorldActivities.some(item => item.activityId === activity.id);
            const card = document.createElement("article");
            card.className = `module-card offline-card ${completed ? "offline-complete" : ""}`;
            card.innerHTML = `
                <span class="module-card-icon">${activity.icon}</span>
                <div>
                    <small>${window.SmartGrowApp.escapeHTML(activity.category)}</small>
                    <h3>${window.SmartGrowApp.escapeHTML(activity.title)}</h3>
                    <p>${window.SmartGrowApp.escapeHTML(activity.instructions)}</p>
                </div>
                <button type="button" class="generate-btn" data-complete-realworld="${activity.id}" ${completed ? "disabled" : ""}>
                    ${completed ? "✓ Completed" : "Mark Complete"}
                </button>
            `;
            grid.appendChild(card);
        });

        window.SmartGrowApp.openModal({
            title: "Screen-to-Real-World",
            description: "Choose a safe offline challenge.",
            body
        });

        body.querySelectorAll("[data-complete-realworld]").forEach(button => {
            button.addEventListener("click", () => completeActivity(button.dataset.completeRealworld));
        });
        body.querySelector("#viewRealWorldHistory").addEventListener("click", showHistory);
    }

    function completeActivity(activityId) {
        const activity = activities.find(item => item.id === activityId);
        if (!activity) {
            window.SmartGrowApp.notify("That activity could not be found.", "error");
            return;
        }
        const data = window.SmartGrowStorage.getData();
        const duplicate = data.completedRealWorldActivities.some(item =>
            item.activityId === activityId && (item.completedAt || "").startsWith(todayKey())
        );
        if (duplicate) {
            window.SmartGrowApp.notify("This activity is already complete for today.", "info");
            return;
        }

        window.SmartGrowStorage.updateArray("completedRealWorldActivities", {
            id: `realworld-${Date.now()}`,
            activityId,
            title: activity.title,
            category: activity.category,
            reward: activity.reward,
            completedAt: new Date().toISOString()
        });
        window.SmartGrowStorage.updateData("activityHistory", history => [
            ...(Array.isArray(history) ? history : []),
            {
                id: `activity-${Date.now()}`,
                module: "real-world",
                title: activity.title,
                completedAt: new Date().toISOString()
            }
        ]);
        window.SmartGrowStorage.updateData("learningProgress.realWorld", value => {
            const progress = value && typeof value === "object" ? value : {};
            progress.completed = Number(progress.completed || 0) + 1;
            progress.updatedAt = new Date().toISOString();
            return progress;
        });

        const completedCount = window.SmartGrowStorage.getData().completedRealWorldActivities.length;
        const achievementId = "realworld-explorer";
        const achievements = window.SmartGrowStorage.getData().achievements;
        if (completedCount === 1 && !achievements.some(item => item.id === achievementId)) {
            window.SmartGrowStorage.updateArray("achievements", {
                id: achievementId,
                title: "Real-World Explorer",
                icon: "🌿",
                earnedAt: new Date().toISOString()
            });
        }

        window.SmartGrowApp.notify(`Completed! You earned “${activity.reward}” 🏆`, "success");
        renderActivities();
    }

    function showHistory() {
        const data = window.SmartGrowStorage.getData();
        const history = data.completedRealWorldActivities.slice().reverse();
        const body = document.createElement("div");
        body.className = "module-list";
        if (!history.length) {
            body.innerHTML = "<p>No offline activities completed yet.</p>";
        } else {
            history.forEach(item => {
                const card = document.createElement("article");
                card.className = "module-card";
                card.innerHTML = `
                    <div>
                        <h3>${window.SmartGrowApp.escapeHTML(item.title)}</h3>
                        <p>${window.SmartGrowApp.escapeHTML(item.category)} • ${window.SmartGrowApp.escapeHTML(item.reward)}</p>
                        <small>${window.SmartGrowApp.formatDate(item.completedAt)}</small>
                    </div>
                `;
                body.appendChild(card);
            });
        }
        window.SmartGrowApp.openModal({
            title: "Offline Activity History",
            description: `${history.length} completed challenge${history.length === 1 ? "" : "s"}`,
            body
        });
    }

    function open() {
        renderActivities();
    }

    window.SmartGrowRealWorld = { open };
})();
