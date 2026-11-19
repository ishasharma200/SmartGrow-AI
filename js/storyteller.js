(function () {
    "use strict";

    const stories = {
        adventure: {
            title: "The Magical Forest Adventure",
            text: name => `${name} discovered a beautiful magical forest one sunny morning.

Inside the forest, ${name} met a tiny fairy who needed help finding her lost magic star.

Together, they followed colourful butterflies, crossed a sparkling river and climbed a little hill.

Finally, they found the star hiding under a giant flower. The fairy smiled and thanked ${name} for being kind and brave.

${name} learned that every adventure becomes special when we help others.

The End! 🌟`
        },
        animals: {
            title: "The Talking Animals",
            text: name => `${name} went for a walk in the green forest.

Suddenly, a little rabbit said, "Hello! Would you like to meet my friends?"

${name} met a clever fox, a dancing elephant and a friendly little bird.

They prepared a surprise birthday party and decorated the trees with flowers.

Everyone laughed, shared fruit and celebrated together.

${name} learned that friendship makes every day happier.

The End! 🐰`
        },
        friendship: {
            title: "The Power of Friendship",
            text: name => `${name} met a new friend at the playground.

At first, both children felt shy. Soon, they shared toys and told funny stories.

When the friend's favourite toy went missing, ${name} helped search near a tree.

They found it under a leaf. The friend smiled and gave ${name} a big hug.

They learned that a true friend is ready to help.

The End! ❤️`
        },
        space: {
            title: "A Journey Through Space",
            text: name => `${name} found a magical rocket in the garden.

The rocket flew past the Moon and hundreds of sparkling stars.

On a colourful planet, ${name} met a friendly little alien.

Together, they explored and discovered beautiful glowing flowers.

Before returning home, ${name} promised to visit again.

The End! 🚀`
        },
        nature: {
            title: "The Little Tree Hero",
            text: name => `${name} noticed a tiny plant growing near the house.

Every morning, ${name} gave it water and made sure it received sunlight.

After many days, the tiny plant became a beautiful green tree.

Birds built nests in its branches and butterflies visited its flowers.

${name} learned that caring for nature makes the world better.

The End! 🌳`
        }
    };

    let modal;
    let nameInput;
    let themeInput;
    let result;
    let errorElement;
    let speechStatus;
    let lastFocusedElement;
    let currentStory = null;
    let utterance = null;
    let initialized = false;

    function todayKey() {
        const date = new Date();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function addAchievement(id, title, icon) {
        const data = window.SmartGrowStorage.getData();
        if (data.achievements.some(item => item.id === id)) return false;
        window.SmartGrowStorage.updateArray("achievements", {
            id,
            title,
            icon,
            earnedAt: new Date().toISOString()
        });
        window.SmartGrowApp.notify(`Achievement unlocked: ${title}! ${icon}`, "success");
        return true;
    }

    function stopSpeech() {
        utterance = null;
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        speechStatus.textContent = "Reading stopped.";
    }

    function updateSavedStoryButtons() {
        const button = document.getElementById("saveStory");
        if (!button || !currentStory) return;
        const data = window.SmartGrowStorage.getData();
        const saved = data.stories.some(story => story.id === currentStory.id);
        button.textContent = saved ? "★ Saved Favourite" : "☆ Save Favourite";
        button.disabled = saved;
    }

    function generateStory() {
        const name = nameInput.value.trim();
        const template = stories[themeInput.value];

        if (!name) {
            errorElement.textContent = "Please enter a character name.";
            errorElement.hidden = false;
            nameInput.focus();
            return;
        }
        if (name.length < 2) {
            errorElement.textContent = "The character name needs at least 2 letters.";
            errorElement.hidden = false;
            nameInput.focus();
            return;
        }
        if (!template) {
            errorElement.textContent = "Please choose an available story category.";
            errorElement.hidden = false;
            return;
        }

        errorElement.hidden = true;
        const id = `story-${Date.now()}`;
        currentStory = {
            id,
            title: template.title,
            category: themeInput.value,
            heroName: name,
            content: template.text(name),
            favourite: false,
            completed: false,
            createdAt: new Date().toISOString()
        };

        document.getElementById("storyTitle").textContent = template.title;
        document.getElementById("storyContent").textContent = currentStory.content;
        result.hidden = false;
        document.getElementById("completeStory").disabled = false;
        speechStatus.textContent = "";
        updateSavedStoryButtons();
        result.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function saveFavourite() {
        if (!currentStory) {
            window.SmartGrowApp.notify("Create a story before saving it.", "warning");
            return;
        }
        const data = window.SmartGrowStorage.getData();
        if (data.stories.some(story => story.id === currentStory.id)) {
            window.SmartGrowApp.notify("This story is already saved.", "info");
            return;
        }
        currentStory.favourite = true;
        window.SmartGrowStorage.updateArray("stories", currentStory);
        window.SmartGrowApp.notify("Story saved to your favourites.", "success");
        updateSavedStoryButtons();
    }

    function completeStory() {
        if (!currentStory) {
            window.SmartGrowApp.notify("Create a story before completing it.", "warning");
            return;
        }
        const data = window.SmartGrowStorage.getData();
        const existingIndex = data.stories.findIndex(story => story.id === currentStory.id);
        currentStory.completed = true;
        currentStory.completedAt = new Date().toISOString();
        if (existingIndex >= 0) {
            window.SmartGrowStorage.updateArray("stories", currentStory, existingIndex);
        } else {
            window.SmartGrowStorage.updateArray("stories", currentStory);
        }
        window.SmartGrowStorage.updateData("activityHistory", history => [
            ...(Array.isArray(history) ? history : []),
            {
                id: `activity-${Date.now()}`,
                module: "storyteller",
                title: currentStory.title,
                completedAt: new Date().toISOString()
            }
        ]);
        window.SmartGrowStorage.updateData("learningProgress.storyteller", value => {
            const progress = value && typeof value === "object" ? value : {};
            progress.completed = Number(progress.completed || 0) + 1;
            progress.updatedAt = new Date().toISOString();
            return progress;
        });

        const completedCount = window.SmartGrowStorage.getData().stories.filter(story =>
            story.completed
        ).length;
        if (completedCount === 1) addAchievement("first-story", "First Story Explorer", "📖");
        if (completedCount >= 5) addAchievement("story-fan", "Story Adventure Star", "🌟");
        window.SmartGrowApp.notify("Story complete! Your learning progress was updated.", "success");
        document.getElementById("completeStory").disabled = true;
    }

    function listenStory() {
        if (!currentStory) {
            window.SmartGrowApp.notify("Create a story before listening.", "warning");
            return;
        }
        if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
            speechStatus.textContent = "Read-aloud is not supported in this browser.";
            return;
        }
        utterance = null;
        window.speechSynthesis.cancel();
        const nextUtterance = new SpeechSynthesisUtterance(currentStory.content);
        utterance = nextUtterance;
        nextUtterance.rate = 0.88;
        nextUtterance.pitch = 1.05;
        nextUtterance.onstart = () => {
            if (utterance === nextUtterance) speechStatus.textContent = "Reading your story...";
        };
        nextUtterance.onend = () => {
            if (utterance !== nextUtterance) return;
            speechStatus.textContent = "Story finished.";
            utterance = null;
        };
        nextUtterance.onerror = () => {
            if (utterance !== nextUtterance) return;
            speechStatus.textContent = "The story could not be played.";
            utterance = null;
        };
        speechStatus.textContent = "Reading your story...";
        window.speechSynthesis.speak(nextUtterance);
    }

    function pauseStory() {
        if (!("speechSynthesis" in window)) return;
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            speechStatus.textContent = "Reading paused.";
        } else if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            speechStatus.textContent = "Reading resumed...";
        }
    }

    function showSavedStories() {
        const data = window.SmartGrowStorage.getData();
        const favourites = data.stories.filter(story => story.favourite);
        if (!favourites.length) {
            window.SmartGrowApp.openModal({
                title: "Saved Stories",
                description: "No favourite stories yet.",
                body: "<p>Create a story and choose “Save Favourite”.</p>"
            });
            return;
        }

        const body = document.createElement("div");
        body.className = "module-list";
        favourites.slice().reverse().forEach(story => {
            const card = document.createElement("article");
            card.className = "module-card";
            card.innerHTML = `
                <div>
                    <h3>${window.SmartGrowApp.escapeHTML(story.title)}</h3>
                    <p>${window.SmartGrowApp.escapeHTML(story.category)} • ${window.SmartGrowApp.formatDate(story.createdAt)}</p>
                </div>
                <button type="button" class="generate-btn" data-view-saved="${window.SmartGrowApp.escapeHTML(story.id)}">Read</button>
            `;
            body.appendChild(card);
        });

        window.SmartGrowApp.openModal({
            title: "Saved Stories",
            description: `${favourites.length} favourite story${favourites.length === 1 ? "" : "ies"} saved`,
            body
        });

        body.querySelectorAll("[data-view-saved]").forEach(button => {
            button.addEventListener("click", () => {
                const story = favourites.find(item => item.id === button.dataset.viewSaved);
                if (!story) return;
                window.SmartGrowApp.closeModal();
                modal.hidden = false;
                nameInput.value = story.heroName;
                themeInput.value = story.category;
                currentStory = { ...story };
                document.getElementById("storyTitle").textContent = story.title;
                document.getElementById("storyContent").textContent = story.content;
                result.hidden = false;
                document.getElementById("completeStory").disabled = Boolean(story.completed);
                updateSavedStoryButtons();
            });
        });
    }

    function close() {
        modal.hidden = true;
        stopSpeech();
        if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
    }

    function open() {
        lastFocusedElement = document.activeElement;
        modal.hidden = false;
        nameInput.focus();
    }

    function initialize() {
        if (initialized) return;
        initialized = true;
        modal = document.getElementById("storyModal");
        nameInput = document.getElementById("heroName");
        themeInput = document.getElementById("storyTheme");
        result = document.getElementById("storyResult");
        errorElement = document.getElementById("storyError");
        speechStatus = document.getElementById("speechStatus");

        const actions = document.createElement("div");
        actions.className = "story-actions storyteller-extra-actions";
        actions.innerHTML = `
            <button class="generate-btn" id="pauseStory" type="button">⏯ Pause / Resume</button>
            <button class="generate-btn" id="stopStory" type="button">⏹ Stop</button>
            <button class="generate-btn" id="saveStory" type="button">☆ Save Favourite</button>
            <button class="generate-btn" id="viewSavedStories" type="button">★ Saved Stories</button>
            <button class="generate-btn" id="completeStory" type="button">✓ Complete Story</button>
        `;
        document.querySelector("#storyModal .story-modal").appendChild(actions);

        document.getElementById("closeStory").addEventListener("click", close);
        document.getElementById("generateStory").addEventListener("click", generateStory);
        document.getElementById("newStory").addEventListener("click", generateStory);
        document.getElementById("listenStory").addEventListener("click", listenStory);
        document.getElementById("pauseStory").addEventListener("click", pauseStory);
        document.getElementById("stopStory").addEventListener("click", stopSpeech);
        document.getElementById("saveStory").addEventListener("click", saveFavourite);
        document.getElementById("viewSavedStories").addEventListener("click", showSavedStories);
        document.getElementById("completeStory").addEventListener("click", completeStory);

        modal.addEventListener("click", event => {
            if (event.target === modal) close();
        });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && !modal.hidden) close();
        });

        window.SmartGrowStoryteller = { open, close };
    }

    window.SmartGrowStorytellerModule = { initialize };
})();
