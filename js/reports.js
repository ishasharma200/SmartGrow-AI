(function () {
    "use strict";

    let initialized = false;

    function todayKey(dateValue) {
        const date = dateValue ? new Date(dateValue) : new Date();
        if (Number.isNaN(date.getTime())) return "";
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function getReportData(days) {
        const data = window.SmartGrowStorage.getData();
        const count = Number(days) || 1;
        const cutoff = new Date();
        cutoff.setHours(12, 0, 0, 0);
        cutoff.setDate(cutoff.getDate() - (count - 1));
        const cutoffKey = todayKey(cutoff);
        const today = todayKey();

        const filterSince = item => {
            if (!item) return false;
            const value = item.completedAt || item.earnedAt || item.createdAt || item.startedAt;
            return typeof value === "string" &&
                value.slice(0, 10) >= cutoffKey &&
                value.slice(0, 10) <= today;
        };

        const stories = (data.stories || []).filter(story => story.completed && filterSince(story));
        const quizzes = (data.quizAttempts || []).filter(attempt => attempt.completed && filterSince(attempt));
        const conversations = (data.talkingBuddyConversations || []).filter(filterSince);
        const realWorld = (data.completedRealWorldActivities || []).filter(filterSince);
        const history = (data.activityHistory || []).filter(filterSince);
        const sessions = (data.screenTimeSessions || []).filter(filterSince);
        const achievements = (data.achievements || []).filter(filterSince);

        const completedQuizScores = quizzes.filter(attempt =>
            Number.isFinite(Number(attempt.score)) &&
            Number.isFinite(Number(attempt.totalQuestions)) &&
            Number(attempt.totalQuestions) > 0
        );
        const averageScore = completedQuizScores.length
            ? Math.round(completedQuizScores.reduce((total, attempt) =>
                total + (Number(attempt.score) / Number(attempt.totalQuestions)) * 100
            , 0) / completedQuizScores.length)
            : 0;

        const trackedMinutes = sessions.reduce((total, session) => {
            const duration = Number(session.durationMinutes);
            return total + (Number.isFinite(duration) ? duration : 0);
        }, 0);

        return {
            data,
            stories,
            quizzes,
            conversations,
            realWorld,
            history,
            sessions,
            achievements,
            averageScore,
            trackedMinutes
        };
    }

    function escapeText(value) {
        return window.SmartGrowApp.escapeHTML(value);
    }

    function renderReportsView(days) {
        const utilityContent = document.getElementById("utilityContent");
        const utilityTitle = document.getElementById("utilityTitle");
        const utilityDescription = document.getElementById("utilityDescription");
        if (!utilityContent || !utilityTitle || !utilityDescription) return;

        const report = getReportData(days);
        utilityTitle.textContent = days === 1 ? "Daily Learning Report" : "Weekly Learning Report";
        utilityDescription.textContent = `Activity saved in this browser • ${days}-day period`;
        utilityContent.replaceChildren();

        const container = document.createElement("div");
        container.className = "module-panel reports-view";
        container.innerHTML = `
            <div class="module-controls report-period-controls">
                <button type="button" class="generate-btn ${days === 1 ? "" : "secondary-btn"}" id="dailyReport">Daily</button>
                <button type="button" class="generate-btn ${days === 7 ? "" : "secondary-btn"}" id="weeklyReport">Weekly</button>
                <button type="button" class="generate-btn secondary-btn" id="printReport">Print / Save PDF</button>
                <button type="button" class="generate-btn secondary-btn" id="exportReport">Export JSON</button>
            </div>
            <div class="parent-grid report-stat-grid">
                <article class="stat-card stat-green"><h4>Tracked Screen Time</h4><h2>${formatMinutes(report.trackedMinutes)}</h2></article>
                <article class="stat-card stat-purple"><h4>Stories Completed</h4><h2>${report.stories.length}</h2></article>
                <article class="stat-card stat-orange"><h4>Quizzes Attempted</h4><h2>${report.quizzes.length}</h2></article>
                <article class="stat-card stat-green"><h4>Average Quiz Score</h4><h2>${report.averageScore}%</h2></article>
                <article class="stat-card stat-purple"><h4>Buddy Conversations</h4><h2>${report.conversations.length}</h2></article>
                <article class="stat-card stat-orange"><h4>Real-World Challenges</h4><h2>${report.realWorld.length}</h2></article>
            </div>
            <section class="control-card">
                <h5>Learning Progress Summary</h5>
                <p>${report.history.length} recorded activities in this reporting period.</p>
                <p>${report.achievements.length} achievements earned in this reporting period.</p>
            </section>
            <section class="control-card">
                <h5>Quiz Performance Report</h5>
                ${renderQuizPerformance(report)}
            </section>
            <section class="control-card">
                <h5>Story Completion Report</h5>
                ${renderStoryReport(report)}
            </section>
            <section class="control-card">
                <h5>Real-World Challenge Report</h5>
                ${renderRealWorldReport(report)}
            </section>
            <section class="control-card">
                <h5>Activity History</h5>
                ${renderActivityHistory(report)}
            </section>
        `;
        utilityContent.appendChild(container);

        container.querySelector("#dailyReport").addEventListener("click", () => renderReportsView(1));
        container.querySelector("#weeklyReport").addEventListener("click", () => renderReportsView(7));
        container.querySelector("#printReport").addEventListener("click", printReport);
        container.querySelector("#exportReport").addEventListener("click", () => exportReport(days));
    }

    function formatMinutes(minutes) {
        const value = Number(minutes);
        if (!Number.isFinite(value) || value <= 0) return "0 min";
        if (value < 60) return `${Math.round(value)} min`;
        const hours = Math.floor(value / 60);
        const remainder = Math.round(value % 60);
        return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
    }

    function renderQuizPerformance(report) {
        if (!report.quizzes.length) return "<p>No completed quizzes in this period.</p>";
        return report.quizzes.slice().reverse().map(attempt => {
            const percentage = attempt.totalQuestions
                ? Math.round((Number(attempt.score) / Number(attempt.totalQuestions)) * 100)
                : 0;
            return `<p><strong>${escapeText(attempt.category)}</strong> — ${escapeText(attempt.difficulty)}: ${percentage}% (${escapeText(attempt.score)}/${escapeText(attempt.totalQuestions)})</p>`;
        }).join("");
    }

    function renderStoryReport(report) {
        if (!report.stories.length) return "<p>No completed stories in this period.</p>";
        return report.stories.slice().reverse().map(story =>
            `<p><strong>${escapeText(story.title)}</strong> — ${escapeText(story.category)} • ${window.SmartGrowApp.formatDate(story.completedAt)}</p>`
        ).join("");
    }

    function renderRealWorldReport(report) {
        if (!report.realWorld.length) return "<p>No completed real-world challenges in this period.</p>";
        return report.realWorld.slice().reverse().map(activity =>
            `<p><strong>${escapeText(activity.title)}</strong> — ${escapeText(activity.category)} • ${window.SmartGrowApp.formatDate(activity.completedAt)}</p>`
        ).join("");
    }

    function renderActivityHistory(report) {
        if (!report.history.length) return "<p>No recorded activity history in this period.</p>";
        return report.history.slice().reverse().map(item =>
            `<p><strong>${escapeText(item.title)}</strong> — ${escapeText(item.module)} • ${window.SmartGrowApp.formatDate(item.completedAt)}</p>`
        ).join("");
    }

    function printReport() {
        const printable = window.confirm("Open print dialog to print or save this report as a PDF?");
        if (!printable) return;
        window.print();
    }

    function exportReport(days) {
        const report = getReportData(days);
        const exportData = {
            generatedAt: new Date().toISOString(),
            periodDays: days,
            childProfile: report.data.childProfile,
            parentSettings: report.data.parentSettings,
            summary: {
                trackedMinutes: Math.round(report.trackedMinutes * 100) / 100,
                storiesCompleted: report.stories.length,
                quizzesAttempted: report.quizzes.length,
                averageQuizScore: report.averageScore,
                buddyConversations: report.conversations.length,
                realWorldActivities: report.realWorld.length,
                achievements: report.achievements.length
            },
            stories: report.stories,
            quizzes: report.quizzes,
            talkingBuddyConversations: report.conversations,
            realWorldActivities: report.realWorld,
            activityHistory: report.history,
            screenTimeSessions: report.sessions
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `smartgrow-${days === 1 ? "daily" : "weekly"}-report-${todayKey()}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        if (window.SmartGrowApp) window.SmartGrowApp.notify("Report exported as JSON.", "success");
    }

    function initialize() {
        if (initialized) return;
        initialized = true;

        window.addEventListener("smartgrow:navigate", event => {
            if (event.detail && event.detail.route === "reports") {
                window.requestAnimationFrame(() => renderReportsView(7));
            }
        });
    }

    window.SmartGrowReports = {
        initialize,
        renderReportsView,
        getReportData,
        exportReport,
        printReport
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
