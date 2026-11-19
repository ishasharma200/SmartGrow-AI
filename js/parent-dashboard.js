(function () {
    "use strict";

    let initialized = false;
    let activeSession = null;
    let unsubscribe = null;
    let warningShown = false;

    function todayKey(dateValue) {
        const date = dateValue ? new Date(dateValue) : new Date();
        if (Number.isNaN(date.getTime())) return "";
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function dateMatches(item, dateKey) {
        if (!item) return false;
        const value = item.completedAt || item.createdAt || item.startedAt;
        return typeof value === "string" && value.slice(0, 10) === dateKey;
    }

    function formatTrackedMinutes(minutes) {
        const value = Number(minutes);
        if (!Number.isFinite(value) || value <= 0) return "0 min";
        if (value < 60) return `${Math.round(value)} min`;
        const hours = Math.floor(value / 60);
        const remainder = Math.round(value % 60);
        return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
    }

    function currentTrackedMinutes(data) {
        const today = todayKey();
        let total = (data.screenTimeSessions || []).reduce((sum, session) => {
            if (!session || typeof session.startedAt !== "string") return sum;
            if (session.startedAt.slice(0, 10) !== today) return sum;
            const duration = Number(session.durationMinutes);
            return sum + (Number.isFinite(duration) ? duration : 0);
        }, 0);
        if (activeSession && typeof activeSession.startedAt === "string") {
            const elapsed = (Date.now() - new Date(activeSession.startedAt).getTime()) / 60000;
            if (Number.isFinite(elapsed) && elapsed > 0) total += elapsed;
        }
        return total;
    }

    function startSession() {
        if (activeSession || document.hidden) return;
        activeSession = {
            id: `screen-${Date.now()}`,
            startedAt: new Date().toISOString()
        };
    }

    function endSession() {
        if (!activeSession) return;
        const endedAt = new Date();
        const startedAt = new Date(activeSession.startedAt);
        const elapsedMinutes = Math.max(0, (endedAt.getTime() - startedAt.getTime()) / 60000);
        if (elapsedMinutes >= 1 / 60) {
            window.SmartGrowStorage.updateArray("screenTimeSessions", {
                id: activeSession.id,
                startedAt: activeSession.startedAt,
                endedAt: endedAt.toISOString(),
                durationMinutes: Math.round(elapsedMinutes * 100) / 100,
                trackingType: "tracked",
                pageActive: true
            });
        }
        activeSession = null;
    }

    function averageQuizScore(data) {
        const attempts = data.quizAttempts || [];
        const completed = attempts.filter(attempt =>
            attempt &&
            attempt.completed &&
            Number.isFinite(Number(attempt.score)) &&
            Number.isFinite(Number(attempt.totalQuestions)) &&
            Number(attempt.totalQuestions) > 0
        );
        if (!completed.length) return 0;
        const percentage = completed.reduce((total, attempt) =>
            total + (Number(attempt.score) / Number(attempt.totalQuestions)) * 100
        , 0);
        return Math.round(percentage / completed.length);
    }

    function getActivityCount(data) {
        const stories = (data.stories || []).filter(story => story.completed).length;
        const quizzes = (data.quizAttempts || []).filter(attempt => attempt.completed).length;
        const conversations = (data.talkingBuddyConversations || []).length;
        const realWorld = (data.completedRealWorldActivities || []).length;
        return stories + quizzes + conversations + realWorld;
    }

    function ensureDashboardDetails() {
        const parentGrid = document.querySelector(".parent-dashboard .parent-grid");
        if (!parentGrid) return null;
        let details = document.getElementById("parentDashboardDetails");
        if (details) return details;

        details = document.createElement("section");
        details.id = "parentDashboardDetails";
        details.className = "parent-dashboard-details";
        details.style.display = "grid";
        details.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
        details.style.gap = "8px";
        details.style.marginTop = "10px";
        details.innerHTML = `
            <article class="control-card parent-stat-detail">
                <h5>📚 Stories Completed</h5>
                <strong id="storiesCompletedStat">0</strong>
            </article>
            <article class="control-card parent-stat-detail">
                <h5>🧩 Quizzes Attempted</h5>
                <strong id="quizzesAttemptedStat">0</strong>
            </article>
            <article class="control-card parent-stat-detail">
                <h5>⭐ Average Quiz Score</h5>
                <strong id="averageQuizScoreStat">0%</strong>
            </article>
            <article class="control-card parent-stat-detail">
                <h5>🤖 Buddy Conversations</h5>
                <strong id="buddyConversationStat">0</strong>
            </article>
            <article class="control-card parent-stat-detail">
                <h5>🌿 Real-World Activities</h5>
                <strong id="realWorldStat">0</strong>
            </article>
            <article class="control-card parent-stat-detail">
                <h5>🏆 Achievements Earned</h5>
                <strong id="achievementStat">0</strong>
            </article>
            <article class="control-card parent-stat-detail">
                <h5>🕒 Tracked Screen Time</h5>
                <strong id="trackedLearningTimeStat">0 min today</strong>
                <small>Browser-active time only</small>
            </article>
            <article class="control-card parent-stat-detail">
                <h5>📅 Daily Learning Activity</h5>
                <strong id="dailyActivityStat">0 activities</strong>
            </article>
            <article class="control-card parent-stat-detail">
                <h5>📈 Weekly Learning Total</h5>
                <strong id="weeklyActivityStat">0 activities</strong>
            </article>
        `;

        const parentDashboard = document.querySelector(".parent-dashboard .main-content");
        const controls = parentDashboard.querySelector(".parent-controls");
        parentDashboard.insertBefore(details, controls);
        return details;
    }

    function ensureParentControls() {
        const controls = document.querySelector(".parent-dashboard .parent-controls");
        if (!controls) return null;

        let screenStatus = document.getElementById("screenTimeStatus");
        if (!screenStatus) {
            screenStatus = document.createElement("p");
            screenStatus.id = "screenTimeStatus";
            screenStatus.setAttribute("role", "status");
            screenStatus.setAttribute("aria-live", "polite");
            document.getElementById("saveMessage").insertAdjacentElement("afterend", screenStatus);
        }

        let preferences = document.getElementById("learningPreferences");
        if (!preferences) {
            preferences = document.createElement("section");
            preferences.id = "learningPreferences";
            preferences.className = "control-card learning-preferences";
            preferences.innerHTML = `
                <h5>Learning Activity Preferences</h5>
                <label><input type="checkbox" id="prefStoryteller"> Storyteller</label>
                <label><input type="checkbox" id="prefGames"> Play &amp; Learn</label>
                <label><input type="checkbox" id="prefBuddy"> Talking Buddy</label>
                <label><input type="checkbox" id="prefRealWorld"> Real-World Challenges</label>
                <button type="button" class="save-btn" id="saveLearningPreferences">Save Preferences</button>
            `;
            controls.appendChild(preferences);
        }

        let restriction = document.getElementById("parentRestrictions");
        if (!restriction) {
            restriction = document.createElement("section");
            restriction.id = "parentRestrictions";
            restriction.className = "control-card parent-restrictions";
            restriction.innerHTML = `
                <h5>Parent-Controlled Restrictions</h5>
                <label><input type="checkbox" id="requireContentSafety"> Require age-safe content</label>
                <label><input type="checkbox" id="restrictOfflineOnly"> Suggest offline learning after the limit</label>
                <button type="button" class="save-btn" id="saveParentRestrictions">Save Restrictions</button>
            `;
            controls.appendChild(restriction);
        }
        return controls;
    }

    function getParentSettings(data) {
        const settings = data.parentSettings || {};
        return {
            learningPreferences: Object.assign({
                storyteller: true,
                games: true,
                buddy: true,
                realWorld: true
            }, settings.learningPreferences || {}),
            restrictions: Object.assign({
                requireContentSafety: true,
                restrictOfflineOnly: false
            }, settings.restrictions || {})
        };
    }

    function renderDashboard() {
        const data = window.SmartGrowStorage.getData();
        ensureDashboardDetails();
        ensureParentControls();

        const today = todayKey();
        const stories = (data.stories || []).filter(story => story.completed);
        const quizzes = (data.quizAttempts || []).filter(attempt => attempt.completed);
        const conversations = data.talkingBuddyConversations || [];
        const realWorld = data.completedRealWorldActivities || [];
        const achievements = data.achievements || [];
        const activityHistory = data.activityHistory || [];

        const dailyStories = stories.filter(story => dateMatches(story, today)).length;
        const dailyQuizzes = quizzes.filter(attempt => dateMatches(attempt, today)).length;
        const dailyBuddy = conversations.filter(item => dateMatches(item, today)).length;
        const dailyRealWorld = realWorld.filter(item => dateMatches(item, today)).length;
        const dailyFromHistory = activityHistory.filter(item => dateMatches(item, today)).length;
        const dailyActivity = Math.max(dailyStories + dailyQuizzes + dailyBuddy + dailyRealWorld, dailyFromHistory);

        const weekStart = new Date();
        weekStart.setHours(12, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() - 6);
        const weekKey = todayKey(weekStart);
        const weeklyActivity = activityHistory.filter(item => {
            const value = item && (item.completedAt || item.createdAt);
            return typeof value === "string" && value.slice(0, 10) >= weekKey && value.slice(0, 10) <= today;
        }).length;

        const setText = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = String(value);
        };

        setText("storiesCompletedStat", stories.length);
        setText("quizzesAttemptedStat", quizzes.length);
        setText("averageQuizScoreStat", `${averageQuizScore(data)}%`);
        setText("buddyConversationStat", conversations.length);
        setText("realWorldStat", realWorld.length);
        setText("achievementStat", achievements.length);
        setText("trackedLearningTimeStat", `${formatTrackedMinutes(currentTrackedMinutes(data))} today`);
        setText("dailyActivityStat", `${dailyActivity} activities`);
        setText("weeklyActivityStat", `${weeklyActivity} activities`);
        setText("activitiesStat", getActivityCount(data));

        const todayMinutes = currentTrackedMinutes(data);
        setText("screenTimeStat", `${formatTrackedMinutes(todayMinutes)}/day`);

        const limit = Number(data.parentSettings.dailyLimitMinutes);
        const remaining = Math.max(0, limit - todayMinutes);
        const status = document.getElementById("screenTimeStatus");
        if (status) {
            status.textContent = todayMinutes >= limit
                ? `Screen-time limit reached. ${formatTrackedMinutes(todayMinutes)} tracked today.`
                : `${formatTrackedMinutes(remaining)} remaining of ${formatTrackedMinutes(limit)} tracked daily limit.`;
            status.className = todayMinutes >= limit ? "screen-time-warning" : "";
        }

        const settings = getParentSettings(data);
        const limitInput = document.getElementById("sessionLimit");
        if (limitInput) limitInput.value = String(Number.isFinite(limit) ? limit : 45);
        const safetyInput = document.getElementById("safeContent");
        if (safetyInput) safetyInput.checked = Boolean(data.parentSettings.safeContent);

        ["prefStoryteller", "prefGames", "prefBuddy", "prefRealWorld"].forEach(id => {
            const element = document.getElementById(id);
            if (!element) return;
            const key = {
                prefStoryteller: "storyteller",
                prefGames: "games",
                prefBuddy: "buddy",
                prefRealWorld: "realWorld"
            }[id];
            element.checked = Boolean(settings.learningPreferences[key]);
        });
        const contentRestriction = document.getElementById("requireContentSafety");
        if (contentRestriction) contentRestriction.checked = Boolean(settings.restrictions.requireContentSafety);
        const offlineRestriction = document.getElementById("restrictOfflineOnly");
        if (offlineRestriction) offlineRestriction.checked = Boolean(settings.restrictions.restrictOfflineOnly);

        if (todayMinutes >= limit && !warningShown) {
            warningShown = true;
            if (window.SmartGrowApp) {
                window.SmartGrowApp.notify("Screen-time limit reached. Browser-only tracked time is active.", "warning");
            }
        }
        if (todayMinutes < limit) warningShown = false;
    }

    function saveLimit() {
        const input = document.getElementById("sessionLimit");
        const message = document.getElementById("saveMessage");
        if (!input) return;
        const limit = Number(input.value);
        if (!Number.isFinite(limit) || limit < 1 || limit > 24 * 60) {
            if (window.SmartGrowApp) window.SmartGrowApp.notify("Choose a valid daily limit.", "error");
            return;
        }
        window.SmartGrowStorage.updateData("parentSettings.dailyLimitMinutes", limit);
        if (message) message.textContent = `Saved: ${limit} minutes per day.`;
        if (window.SmartGrowApp) window.SmartGrowApp.notify("Daily screen-time limit saved.", "success");
    }

    function savePreferences() {
        const preferences = {
            storyteller: document.getElementById("prefStoryteller").checked,
            games: document.getElementById("prefGames").checked,
            buddy: document.getElementById("prefBuddy").checked,
            realWorld: document.getElementById("prefRealWorld").checked
        };
        window.SmartGrowStorage.updateData("parentSettings.learningPreferences", preferences);
        if (window.SmartGrowApp) window.SmartGrowApp.notify("Learning activity preferences saved.", "success");
    }

    function saveRestrictions() {
        const restrictions = {
            requireContentSafety: document.getElementById("requireContentSafety").checked,
            restrictOfflineOnly: document.getElementById("restrictOfflineOnly").checked
        };
        window.SmartGrowStorage.updateData("parentSettings.restrictions", restrictions);
        window.SmartGrowStorage.updateData("parentSettings.safeContent", restrictions.requireContentSafety);
        if (window.SmartGrowApp) window.SmartGrowApp.notify("Parent restrictions saved.", "success");
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            endSession();
        } else {
            startSession();
        }
    }

    function initialize() {
        if (initialized) return;
        initialized = true;

        if (!window.SmartGrowStorage) {
            console.error("SmartGrow storage is unavailable.");
            return;
        }

        unsubscribe = window.SmartGrowStorage.subscribe(renderDashboard);
        startSession();

        const saveLimitButton = document.getElementById("saveLimit");
        if (saveLimitButton) {
            saveLimitButton.setAttribute("data-parent-limit-bound", "true");
        }

        const safetyInput = document.getElementById("safeContent");
        if (safetyInput) {
            safetyInput.setAttribute("data-parent-safety-bound", "true");
        }

        const preferenceButton = document.getElementById("saveLearningPreferences");
        if (preferenceButton) preferenceButton.addEventListener("click", savePreferences);

        const restrictionButton = document.getElementById("saveParentRestrictions");
        if (restrictionButton) restrictionButton.addEventListener("click", saveRestrictions);

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("beforeunload", endSession);
        window.addEventListener("pagehide", endSession);

        renderDashboard();

        window.setInterval(() => {
            if (activeSession) renderDashboard();
        }, 30000);
    }

    window.SmartGrowParentDashboard = {
        initialize,
        renderDashboard,
        endSession,
        getCurrentTrackedMinutes: () => currentTrackedMinutes(window.SmartGrowStorage.getData()),
        dispose() {
            endSession();
            if (typeof unsubscribe === "function") unsubscribe();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("beforeunload", endSession);
            window.removeEventListener("pagehide", endSession);
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
