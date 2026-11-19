(function () {
    "use strict";

    let modalLastFocus = null;
    let modalCloseCallback = null;
    let initialized = false;

    function escapeHTML(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatDate(dateOrValue) {
        const date = dateOrValue instanceof Date ? dateOrValue : new Date(dateOrValue);
        if (Number.isNaN(date.getTime())) return "";
        return new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        }).format(date);
    }

    function formatMinutes(minutes) {
        const value = Number(minutes);
        if (!Number.isFinite(value) || value < 0) return "0 min";
        if (value < 60) return `${Math.round(value)} min`;
        const hours = Math.floor(value / 60);
        const remainder = Math.round(value % 60);
        return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
    }

    function notify(message, type) {
        const region = document.getElementById("toastRegion");
        if (!region) return;
        region.style.position = "fixed";
        region.style.right = "16px";
        region.style.bottom = "16px";
        region.style.zIndex = "2000";
        region.style.display = "grid";
        region.style.gap = "8px";
        region.style.width = "min(340px, calc(100vw - 32px))";
        const safeType = ["success", "warning", "error", "info"].includes(type) ? type : "info";
        const toast = document.createElement("div");
        toast.className = `toast toast-${safeType}`;
        toast.setAttribute("role", "status");
        toast.style.display = "flex";
        toast.style.alignItems = "center";
        toast.style.justifyContent = "space-between";
        toast.style.gap = "12px";
        toast.style.padding = "12px 14px";
        toast.style.borderRadius = "12px";
        toast.style.background = safeType === "error"
            ? "#ffe2e2"
            : safeType === "warning"
                ? "#fff2c7"
                : safeType === "success"
                    ? "#dcf7e8"
                    : "#e4efff";
        toast.style.border = "1px solid #ccd9ec";
        toast.style.boxShadow = "0 8px 24px rgba(39, 60, 129, 0.18)";
        toast.style.color = "#18264d";
        toast.style.fontSize = "13px";

        const text = document.createElement("span");
        text.textContent = String(message);
        const close = document.createElement("button");
        close.type = "button";
        close.setAttribute("aria-label", "Dismiss notification");
        close.textContent = "✕";
        close.style.border = "none";
        close.style.background = "transparent";
        close.style.cursor = "pointer";
        close.addEventListener("click", () => {
            toast.remove();
        });

        toast.append(text, close);
        region.appendChild(toast);
        window.setTimeout(() => {
            toast.classList.add("toast-leaving");
            window.setTimeout(() => toast.remove(), 200);
        }, 4500);
    }

    function setModalBody(body) {
        const modalBody = document.getElementById("appModalBody");
        if (!modalBody) return;
        modalBody.replaceChildren();
        if (typeof body === "string") {
            modalBody.innerHTML = body;
        } else if (body instanceof HTMLElement) {
            modalBody.appendChild(body);
        }
    }

    function openModal(options) {
        const modal = document.getElementById("appModal");
        if (!modal) return false;

        modalLastFocus = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        modalCloseCallback = typeof options.onClose === "function"
            ? options.onClose
            : null;

        document.getElementById("appModalTitle").textContent = options.title || "SmartGrow";
        document.getElementById("appModalDescription").textContent =
            options.description || "";
        setModalBody(options.body || "");

        const actions = document.getElementById("appModalActions");
        actions.replaceChildren();
        (options.actions || []).forEach(action => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = action.className || "generate-btn";
            button.textContent = action.label;
            button.addEventListener("click", () => {
                if (action.close !== false) closeModal();
                if (typeof action.onClick === "function") action.onClick();
            });
            actions.appendChild(button);
        });

        modal.hidden = false;
        document.body.classList.add("modal-open");
        window.requestAnimationFrame(() => {
            const focusTarget = modal.querySelector("[autofocus], button, input, select");
            if (focusTarget) focusTarget.focus();
        });
        return true;
    }

    function closeModal() {
        const modal = document.getElementById("appModal");
        if (!modal || modal.hidden) return;
        modal.hidden = true;
        document.body.classList.remove("modal-open");
        if (typeof modalCloseCallback === "function") {
            const callback = modalCloseCallback;
            modalCloseCallback = null;
            callback();
        }
        if (modalLastFocus && typeof modalLastFocus.focus === "function") {
            modalLastFocus.focus();
        }
        modalLastFocus = null;
    }

    function renderProfile() {
        const data = window.SmartGrowStorage.getData();
        const profile = data.childProfile || {};
        const name = String(profile.name || "Mia").trim() || "Mia";
        const age = Number(profile.age);
        const ageText = Number.isFinite(age) && age > 0 ? `${age} years` : "Age not set";
        const level = String(profile.learningLevel || "Beginner");
        const avatar = String(profile.avatar || "👧🏻");

        const welcome = document.getElementById("welcomeHeading");
        if (welcome) welcome.textContent = `Hello, ${name}! Ready to grow today?`;

        const profileAge = document.getElementById("profileAge");
        if (profileAge) profileAge.textContent = ageText;

        ["profileAvatar", "heroAvatar", "childProfileAvatar"].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = avatar;
        });

        const heading = document.getElementById("childProfileHeading");
        if (heading) heading.textContent = `${name}'s Profile`;

        const ageValue = document.getElementById("childAgeText");
        if (ageValue) ageValue.textContent = `Age: ${ageText}`;

        const levelValue = document.getElementById("childLevelText");
        if (levelValue) levelValue.textContent = `Learning Level: ${level}`;
    }

    function getTodayKey(dateValue) {
        const date = dateValue ? new Date(dateValue) : new Date();
        if (Number.isNaN(date.getTime())) return "";
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function renderDashboard() {
        const data = window.SmartGrowStorage.getData();
        const today = getTodayKey();

        const storiesToday = data.stories.filter(item =>
            item && getTodayKey(item.completedAt || item.createdAt) === today
        ).length;
        const gamesToday = data.quizAttempts.filter(item =>
            item && getTodayKey(item.completedAt || item.createdAt) === today
        ).length;
        const buddyToday = data.talkingBuddyConversations.filter(item =>
            item && getTodayKey(item.createdAt || item.completedAt) === today
        ).length;

        const storyCount = document.getElementById("storyWinCount");
        const gameCount = document.getElementById("gameWinCount");
        const buddyCount = document.getElementById("buddyWinCount");
        if (storyCount) storyCount.textContent = String(storiesToday);
        if (gameCount) gameCount.textContent = String(gamesToday);
        if (buddyCount) buddyCount.textContent = String(buddyToday);

        const completedActivities =
            data.stories.length +
            data.quizAttempts.length +
            data.talkingBuddyConversations.length +
            data.completedRealWorldActivities.length;

        const activitiesStat = document.getElementById("activitiesStat");
        if (activitiesStat) activitiesStat.textContent = String(completedActivities);

        const progressStat = document.getElementById("learningProgressStat");
        const progress = data.learningProgress || {};
        const moduleNames = ["storyteller", "games", "talkingBuddy", "realWorld"];
        const completedMilestones = moduleNames.reduce((total, name) => {
            const completed = Number(progress[name] && progress[name].completed);
            return total + (Number.isFinite(completed) && completed > 0 ? Math.min(5, completed) : 0);
        }, 0);
        const progressPercent = Math.round((completedMilestones / 20) * 100);
        if (progressStat) {
            progressStat.textContent = `${progressPercent}%`;
        }

        const childProgressPercent = document.getElementById("childProgressPercent");
        const childProgressSummary = document.getElementById("childProgressSummary");
        const childProgressTrack = document.getElementById("childProgressTrack");
        const childProgressFill = document.getElementById("childProgressFill");
        if (childProgressPercent) childProgressPercent.textContent = `${progressPercent}%`;
        if (childProgressSummary) {
            childProgressSummary.textContent =
                `${completedMilestones} of 20 learning steps completed. Keep exploring!`;
        }
        if (childProgressTrack) childProgressTrack.setAttribute("aria-valuenow", String(progressPercent));
        if (childProgressFill) childProgressFill.style.width = `${progressPercent}%`;

        const achievementList = document.getElementById("childAchievementList");
        if (achievementList) {
            achievementList.replaceChildren();
            if (!data.achievements.length) {
                const emptyState = document.createElement("p");
                emptyState.className = "child-achievement-empty";
                emptyState.textContent = "Your badges will appear here as you learn and explore.";
                achievementList.appendChild(emptyState);
            } else {
                data.achievements.slice().reverse().forEach(achievement => {
                    const badge = document.createElement("article");
                    badge.className = "child-achievement";
                    const icon = document.createElement("span");
                    icon.className = "child-achievement-icon";
                    icon.setAttribute("aria-hidden", "true");
                    icon.textContent = achievement.icon || "🏅";
                    const title = document.createElement("strong");
                    title.textContent = achievement.title || "Learning Star";
                    badge.append(icon, title);
                    achievementList.appendChild(badge);
                });
            }
        }

        const todaySessions = data.screenTimeSessions.filter(item =>
            item && getTodayKey(item.startedAt || item.createdAt) === today
        );
        const todayMinutes = todaySessions.reduce((total, item) => {
            const duration = Number(item.durationMinutes);
            return total + (Number.isFinite(duration) ? duration : 0);
        }, 0);
        const screenTimeStat = document.getElementById("screenTimeStat");
        if (screenTimeStat) screenTimeStat.textContent = `${todayMinutes} min/day`;

        renderWeeklyChart(data);
    }

    function renderWeeklyChart(data) {
        const chart = document.getElementById("weeklyChart");
        if (!chart) return;

        const now = new Date();
        chart.replaceChildren();
        for (let offset = 6; offset >= 0; offset -= 1) {
            const date = new Date(now);
            date.setHours(12, 0, 0, 0);
            date.setDate(date.getDate() - offset);
            const key = getTodayKey(date);

            const allActivities = [
                ...data.stories,
                ...data.quizAttempts,
                ...data.talkingBuddyConversations,
                ...data.completedRealWorldActivities
            ];
            const count = allActivities.filter(item =>
                item && getTodayKey(item.completedAt || item.createdAt || item.startedAt) === key
            ).length;
            const height = count ? Math.min(100, 20 + (count * 16)) : 5;

            const column = document.createElement("div");
            column.className = "chart-column";
            const bar = document.createElement("div");
            bar.className = "bar";
            bar.style.height = `${height}%`;
            bar.setAttribute("aria-label", `${count} activities`);
            const label = document.createElement("small");
            label.textContent = date.toLocaleDateString(undefined, { weekday: "short" });
            column.append(bar, label);
            chart.appendChild(column);
        }
    }

    function renderSettings() {
        const data = window.SmartGrowStorage.getData();
        const sessionLimit = document.getElementById("sessionLimit");
        const safeContent = document.getElementById("safeContent");
        if (sessionLimit) {
            sessionLimit.value = String(data.parentSettings.dailyLimitMinutes);
        }
        if (safeContent) {
            safeContent.checked = Boolean(data.parentSettings.safeContent);
        }
    }

    function showUtilityRoute(route) {
        const view = document.getElementById("utilityView");
        if (!view) return;
        const title = document.getElementById("utilityTitle");
        const description = document.getElementById("utilityDescription");
        const content = document.getElementById("utilityContent");
        if (!title || !description || !content) return;

        const data = window.SmartGrowStorage.getData();
        const profile = data.childProfile;

        if (route === "profiles") {
            title.textContent = "Child Profiles";
            description.textContent = "Review and manage the active learning profile.";
            content.innerHTML =
                `<div class="parent-grid">
                    <article class="profile-card">
                        <h4>${escapeHTML(profile.name)}'s Profile</h4>
                        <div class="child-info">
                            <div class="child-avatar">${escapeHTML(profile.avatar)}</div>
                            <div>
                                <p>Age: ${escapeHTML(profile.age)} years</p>
                                <p>Learning Level: ${escapeHTML(profile.learningLevel)}</p>
                            </div>
                        </div>
                    </article>
                </div>`;
        } else if (route === "settings") {
            title.textContent = "Settings";
            description.textContent = "Learning and parent controls.";
            content.innerHTML =
                `<div class="parent-controls">
                    <section class="control-card">
                        <h5>🕒 Daily Session Limit</h5>
                        <p>${escapeHTML(formatMinutes(data.parentSettings.dailyLimitMinutes))} per day</p>
                    </section>
                    <section class="control-card">
                        <h5>🛡 Content Safety</h5>
                        <p>${data.parentSettings.safeContent ? "Age-appropriate content enabled" : "Age-appropriate content disabled"}</p>
                    </section>
                </div>`;
        } else if (route === "reports") {
            title.textContent = "Learning Reports";
            description.textContent = "Reports are calculated from saved learning activity.";
            content.innerHTML =
                `<div class="parent-grid">
                    <article class="stat-card stat-green"><h4>Stories</h4><h2>${data.stories.length}</h2></article>
                    <article class="stat-card stat-purple"><h4>Quiz attempts</h4><h2>${data.quizAttempts.length}</h2></article>
                    <article class="stat-card stat-orange"><h4>Real-world activities</h4><h2>${data.completedRealWorldActivities.length}</h2></article>
                </div>`;
        } else if (route === "help") {
            title.textContent = "Help";
            description.textContent = "Quick help for SmartGrow AI.";
            content.innerHTML =
                `<div class="parent-controls">
                    <section class="control-card"><h5>📖 Start a module</h5><p>Choose one of the four learning cards to begin.</p></section>
                    <section class="control-card"><h5>💾 Saved progress</h5><p>Your profile and activities stay in this browser.</p></section>
                    <section class="control-card"><h5>🛡 Parent controls</h5><p>Open the Parent Dashboard to review limits and safety settings.</p></section>
                </div>`;
        }
    }

    function openMobileMenu() {
        openModal({
            title: "Navigation",
            description: "Choose a SmartGrow section.",
            body: `
                <div class="feature-grid navigation-menu" aria-label="Navigation links">
                    <button class="feature-card blue" type="button" data-menu-route="child"><span class="feature-icon">🏠</span><h3>Child Home</h3></button>
                    <button class="feature-card purple" type="button" data-menu-route="learning"><span class="feature-icon">📚</span><h3>My Learning</h3></button>
                    <button class="feature-card yellow" type="button" data-menu-route="parent"><span class="feature-icon">📊</span><h3>Parent Dashboard</h3></button>
                    <button class="feature-card pink" type="button" data-menu-route="profiles"><span class="feature-icon">👨‍👩‍👧</span><h3>Child Profiles</h3></button>
                    <button class="feature-card green" type="button" data-menu-route="settings"><span class="feature-icon">⚙️</span><h3>Settings</h3></button>
                    <button class="feature-card purple" type="button" data-menu-route="reports"><span class="feature-icon">📋</span><h3>Reports</h3></button>
                    <button class="feature-card blue" type="button" data-menu-route="help"><span class="feature-icon">❔</span><h3>Help</h3></button>
                </div>
            `
        });
        document.querySelectorAll("#appModal [data-menu-route]").forEach(button => {
            button.addEventListener("click", () => {
                closeModal();
                window.SmartGrowNavigation.navigate(button.dataset.menuRoute);
            });
        });
    }

    function initializeModule(name, method) {
        try {
            if (window[name] && typeof window[name][method] === "function") {
                window[name][method]();
                return true;
            }
        } catch (error) {
            console.error(`SmartGrow could not initialize ${name}:`, error);
            notify(`A feature could not start: ${name.replace("SmartGrow", "")}`, "error");
        }
        return false;
    }

    function initialize() {
        if (initialized) return;
        initialized = true;

        if (!window.SmartGrowStorage) {
            console.error("SmartGrow storage failed to load.");
            return;
        }

        window.SmartGrowStorage.subscribe(() => {
            renderProfile();
            renderDashboard();
            renderSettings();
            const route = window.SmartGrowNavigation
                ? window.SmartGrowNavigation.getCurrentRoute()
                : "child";
            showUtilityRoute(route);
        });

        initializeModule("SmartGrowStorytellerModule", "initialize");
        initializeModule("SmartGrowNavigation", "initialize");

        const startLearning = document.getElementById("startLearning");
        if (startLearning) {
            startLearning.addEventListener("click", () => {
                window.SmartGrowNavigation.navigate("learning");
                notify("Choose a learning adventure!", "success");
            });
        }

        const closeAppModalButton = document.getElementById("closeAppModal");
        if (closeAppModalButton) closeAppModalButton.addEventListener("click", closeModal);

        const appModal = document.getElementById("appModal");
        if (appModal) {
            appModal.addEventListener("click", event => {
                if (event.target === appModal) closeModal();
            });
        }

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeModal();
            }
        });

        const sessionLimit = document.getElementById("sessionLimit");
        const saveLimit = document.getElementById("saveLimit");
        if (saveLimit && sessionLimit) {
            saveLimit.addEventListener("click", () => {
                const minutes = Number(sessionLimit.value);
                if (!Number.isFinite(minutes) || minutes < 1) {
                    notify("Choose a valid daily session limit.", "error");
                    return;
                }
                window.SmartGrowStorage.updateData("parentSettings.dailyLimitMinutes", minutes);
                notify(`Daily limit saved: ${minutes} minutes.`, "success");
            });
        }

        const safeContent = document.getElementById("safeContent");
        if (safeContent) {
            safeContent.addEventListener("change", () => {
                window.SmartGrowStorage.updateData("parentSettings.safeContent", safeContent.checked);
                window.SmartGrowStorage.updateData(
                    "parentSettings.restrictions.requireContentSafety",
                    safeContent.checked
                );
                notify(
                    safeContent.checked
                        ? "Age-appropriate content enabled."
                        : "Age-appropriate content disabled.",
                    "success"
                );
            });
        }

        renderProfile();
        renderDashboard();
        renderSettings();
    }

    window.SmartGrowApp = {
        initialize,
        openModal,
        closeModal,
        notify,
        escapeHTML,
        formatDate,
        formatMinutes,
        showUtilityRoute,
        openMobileMenu,
        renderProfile,
        renderDashboard
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
