(function () {
    "use strict";

    const questionBank = {
        Mathematics: [
            { easy: "What is 2 + 3?", options: ["4", "5", "6", "7"], answer: "5" },
            { easy: "What is 6 - 2?", options: ["2", "3", "4", "5"], answer: "4" },
            { medium: "What is 6 × 3?", options: ["12", "18", "20", "24"], answer: "18" },
            { medium: "What is 20 ÷ 5?", options: ["2", "4", "5", "10"], answer: "4" },
            { hard: "What is 12 × 4?", options: ["36", "44", "48", "52"], answer: "48" },
            { hard: "What is 75 ÷ 5?", options: ["15", "12", "25", "5"], answer: "15" }
        ],
        English: [
            { easy: "Which word is a colour?", options: ["Jump", "Blue", "Chair", "Happy"], answer: "Blue" },
            { easy: "Which is the opposite of hot?", options: ["Warm", "Cold", "Sunny", "Bright"], answer: "Cold" },
            { medium: "Which word means “very large”?", options: ["Tiny", "Huge", "Quiet", "Fast"], answer: "Huge" },
            { medium: "Which word is a noun?", options: ["Run", "Beautiful", "Tree", "Quickly"], answer: "Tree" },
            { hard: "Choose the correctly spelled word.", options: ["Beginer", "Begginer", "Beginner", "Beeginner"], answer: "Beginner" },
            { hard: "Which word is a verb?", options: ["Garden", "Explore", "Yellow", "Garden"], answer: "Explore" }
        ],
        Science: [
            { easy: "Which planet do we live on?", options: ["Mars", "Earth", "Venus", "Moon"], answer: "Earth" },
            { easy: "What do plants need to grow?", options: ["Music", "Sunlight", "Sand", "Plastic"], answer: "Sunlight" },
            { medium: "What do we call water as a gas?", options: ["Ice", "Steam", "Rain", "Snow"], answer: "Steam" },
            { medium: "Which body part helps us think?", options: ["Brain", "Heart", "Hand", "Foot"], answer: "Brain" },
            { hard: "How many planets orbit our Sun?", options: ["6", "7", "8", "9"], answer: "8" },
            { hard: "What force pulls things toward Earth?", options: ["Magnetism", "Gravity", "Electricity", "Wind"], answer: "Gravity" }
        ],
        "General Knowledge": [
            { easy: "How many days are in a week?", options: ["5", "6", "7", "8"], answer: "7" },
            { easy: "Which shape has three sides?", options: ["Square", "Circle", "Triangle", "Rectangle"], answer: "Triangle" },
            { medium: "What is the capital of France?", options: ["Rome", "Paris", "Madrid", "Berlin"], answer: "Paris" },
            { medium: "Which ocean is the largest?", options: ["Atlantic", "Indian", "Pacific", "Arctic"], answer: "Pacific" },
            { hard: "How many continents are there?", options: ["5", "6", "7", "8"], answer: "7" },
            { hard: "Which season comes after summer?", options: ["Winter", "Spring", "Autumn", "Monsoon"], answer: "Autumn" }
        ]
    };

    let state = null;

    function todayKey() {
        const date = new Date();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function selectedQuestions(category, difficulty) {
        const all = questionBank[category] || [];
        return all.filter(item => typeof item[difficulty] === "string").map(item => ({
            question: item[difficulty],
            options: item.options,
            answer: item.answer
        })).slice(0, 5);
    }

    function ensureQuizData() {
        const data = window.SmartGrowStorage.getData();
        if (!Array.isArray(data.quizAttempts)) {
            window.SmartGrowStorage.updateData("quizAttempts", []);
        }
    }

    function awardQuizAchievements(score, total) {
        const data = window.SmartGrowStorage.getData();
        const achievements = data.achievements || [];
        const completeCount = data.quizAttempts.filter(item => item.completed).length;
        const earned = [];

        if (completeCount >= 1 && !achievements.some(item => item.id === "first-quiz")) {
            earned.push({ id: "first-quiz", title: "Quiz Starter", icon: "🧩" });
        }
        if (score === total && total > 0 && !achievements.some(item => item.id === "perfect-quiz")) {
            earned.push({ id: "perfect-quiz", title: "Perfect Score", icon: "⭐" });
        }
        earned.forEach(achievement => {
            window.SmartGrowStorage.updateArray("achievements", {
                ...achievement,
                earnedAt: new Date().toISOString()
            });
        });
        if (earned.length) {
            window.SmartGrowApp.notify(`Achievement unlocked: ${earned.map(item => item.title).join(", ")}`, "success");
        }
    }

    function renderSetup() {
        const body = document.createElement("div");
        body.className = "module-panel";
        body.innerHTML = `
            <div class="module-controls">
                <label>Category
                    <select id="quizCategory">
                        <option>Mathematics</option>
                        <option>English</option>
                        <option>Science</option>
                        <option>General Knowledge</option>
                    </select>
                </label>
                <label>Difficulty
                    <select id="quizDifficulty">
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </label>
            </div>
            <div class="module-actions">
                <button type="button" class="generate-btn" id="startQuiz">Start Quiz</button>
                <button type="button" class="generate-btn secondary-btn" id="viewQuizHistory">Quiz History</button>
            </div>
        `;
        window.SmartGrowApp.openModal({
            title: "AI Play & Learn",
            description: "Choose a subject and challenge level.",
            body
        });

        body.querySelector("#startQuiz").addEventListener("click", startQuiz);
        body.querySelector("#viewQuizHistory").addEventListener("click", showHistory);
    }

    function startQuiz() {
        const category = document.getElementById("quizCategory").value;
        const difficulty = document.getElementById("quizDifficulty").value;
        startSpecificQuiz(category, difficulty);
    }

    function startSpecificQuiz(category, difficulty) {
        const questions = selectedQuestions(category, difficulty);
        if (!questions.length) {
            window.SmartGrowApp.notify("No questions are available for this choice.", "error");
            return;
        }
        state = {
            category,
            difficulty,
            questions,
            index: 0,
            score: 0,
            answered: false,
            startedAt: new Date().toISOString()
        };
        renderQuestion();
    }

    function renderQuestion() {
        const question = state.questions[state.index];
        const body = document.createElement("div");
        body.className = "module-panel";
        body.innerHTML = `
            <div class="quiz-progress">
                <span>${state.category} • ${state.difficulty}</span>
                <strong>Question ${state.index + 1} / ${state.questions.length}</strong>
            </div>
            <h3 class="quiz-question">${window.SmartGrowApp.escapeHTML(question.question)}</h3>
            <div class="answer-grid">
                ${question.options.map(option =>
                    `<button type="button" class="answer-option" data-answer="${window.SmartGrowApp.escapeHTML(option)}">${window.SmartGrowApp.escapeHTML(option)}</button>`
                ).join("")}
            </div>
            <p id="quizFeedback" class="module-feedback" role="status"></p>
            <div class="module-actions">
                <button type="button" class="generate-btn secondary-btn" id="exitQuiz">Exit</button>
            </div>
        `;
        window.SmartGrowApp.openModal({
            title: "Play & Learn",
            description: "Choose the best answer.",
            body
        });
        body.querySelectorAll("[data-answer]").forEach(button => {
            button.addEventListener("click", () => answerQuestion(button));
        });
        body.querySelector("#exitQuiz").addEventListener("click", () => {
            window.SmartGrowApp.closeModal();
        });
    }

    function answerQuestion(button) {
        if (state.answered) return;
        state.answered = true;
        const question = state.questions[state.index];
        const selected = button.dataset.answer;
        const correct = selected === question.answer;
        if (correct) state.score += 1;

        document.querySelectorAll(".answer-option").forEach(option => {
            option.disabled = true;
            if (option.dataset.answer === question.answer) option.classList.add("answer-correct");
            if (option === button && !correct) option.classList.add("answer-incorrect");
        });
        const feedback = document.getElementById("quizFeedback");
        feedback.textContent = correct ? "Correct! Great thinking! ⭐" : `Not quite. The answer is ${question.answer}.`;
        feedback.className = `module-feedback ${correct ? "feedback-success" : "feedback-error"}`;

        const nextButton = document.createElement("button");
        nextButton.type = "button";
        nextButton.className = "generate-btn";
        nextButton.textContent = state.index + 1 < state.questions.length ? "Next Question" : "See My Score";
        nextButton.addEventListener("click", () => {
            if (state.index + 1 < state.questions.length) {
                state.index += 1;
                state.answered = false;
                renderQuestion();
            } else {
                finishQuiz();
            }
        });
        feedback.insertAdjacentElement("afterend", nextButton);
    }

    function finishQuiz() {
        ensureQuizData();
        const attempt = {
            id: `quiz-${Date.now()}`,
            category: state.category,
            difficulty: state.difficulty,
            score: state.score,
            totalQuestions: state.questions.length,
            completed: true,
            startedAt: state.startedAt,
            completedAt: new Date().toISOString()
        };
        window.SmartGrowStorage.updateArray("quizAttempts", attempt);
        window.SmartGrowStorage.updateData("activityHistory", history => [
            ...(Array.isArray(history) ? history : []),
            {
                id: `activity-${Date.now()}`,
                module: "games",
                title: `${state.category} quiz`,
                completedAt: new Date().toISOString()
            }
        ]);
        window.SmartGrowStorage.updateData("learningProgress.games", value => {
            const progress = value && typeof value === "object" ? value : {};
            progress.completed = Number(progress.completed || 0) + 1;
            progress.updatedAt = new Date().toISOString();
            return progress;
        });
        awardQuizAchievements(state.score, state.questions.length);
        renderResults(attempt);
    }

    function renderResults(attempt) {
        const body = document.createElement("div");
        body.className = "module-panel results-panel";
        const percentage = Math.round((attempt.score / attempt.totalQuestions) * 100);
        body.innerHTML = `
            <div class="score-circle">${percentage}%</div>
            <h3>${attempt.score} out of ${attempt.totalQuestions} correct</h3>
            <p>${percentage >= 80 ? "Amazing work! You mastered this challenge. 🌟" : "Good practice! Try again to improve your score. 🌱"}</p>
            <div class="module-actions">
                <button type="button" class="generate-btn" id="restartQuiz">Play Again</button>
                <button type="button" class="generate-btn secondary-btn" id="backToQuizSetup">Choose Another</button>
            </div>
        `;
        window.SmartGrowApp.openModal({
            title: "Quiz Complete",
            description: `${attempt.category} • ${attempt.difficulty}`,
            body
        });
        body.querySelector("#restartQuiz").addEventListener("click", () => {
            startSpecificQuiz(attempt.category, attempt.difficulty);
        });
        body.querySelector("#backToQuizSetup").addEventListener("click", renderSetup);
    }

    function showHistory() {
        const data = window.SmartGrowStorage.getData();
        const history = data.quizAttempts.slice().reverse();
        const body = document.createElement("div");
        body.className = "module-list";
        if (!history.length) {
            body.innerHTML = "<p>No quiz attempts yet. Start a quiz to build your history.</p>";
        } else {
            history.forEach(attempt => {
                const card = document.createElement("article");
                card.className = "module-card";
                card.innerHTML = `
                    <div>
                        <h3>${window.SmartGrowApp.escapeHTML(attempt.category)}</h3>
                        <p>${window.SmartGrowApp.escapeHTML(attempt.difficulty)} • ${attempt.score}/${attempt.totalQuestions}</p>
                        <small>${window.SmartGrowApp.formatDate(attempt.completedAt)}</small>
                    </div>
                `;
                body.appendChild(card);
            });
        }
        window.SmartGrowApp.openModal({
            title: "Quiz History",
            description: `${history.length} completed attempt${history.length === 1 ? "" : "s"}`,
            body
        });
    }

    function open() {
        ensureQuizData();
        renderSetup();
    }

    window.SmartGrowGames = { open };
})();
