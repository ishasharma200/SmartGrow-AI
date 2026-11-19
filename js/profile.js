(function () {
    "use strict";

    let initialized = false;

    const avatars = ["👧🏻", "👦🏻", "👧🏽", "👦🏽", "👧🏾", "👦🏾", "🧒"];

    function ensureProfiles(data) {
        let profiles = Array.isArray(data.childProfiles) ? data.childProfiles : [];
        if (!profiles.length) {
            profiles = [{
                id: "primary",
                name: data.childProfile.name || "Mia",
                age: data.childProfile.age || 6,
                learningLevel: data.childProfile.learningLevel || "Beginner",
                avatar: data.childProfile.avatar || "👧🏻",
                active: true
            }];
            window.SmartGrowStorage.updateData("childProfiles", profiles);
        }
        if (!profiles.some(profile => profile.active)) {
            profiles = profiles.map((profile, index) =>
                ({ ...profile, active: index === 0 })
            );
            window.SmartGrowStorage.updateData("childProfiles", profiles);
        }
        return profiles;
    }

    function getActiveProfile(data) {
        const profiles = ensureProfiles(data);
        return profiles.find(profile => profile.active) || profiles[0];
    }

    function validateProfile(values) {
        const name = String(values.name || "").trim();
        const age = Number(values.age);
        if (name.length < 2 || name.length > 40) {
            return "Name must contain between 2 and 40 characters.";
        }
        if (!Number.isInteger(age) || age < 3 || age > 17) {
            return "Age must be a whole number from 3 to 17.";
        }
        if (!avatars.includes(values.avatar)) {
            return "Choose an available avatar.";
        }
        if (!["Beginner", "Developing", "Intermediate", "Advanced"].includes(values.learningLevel)) {
            return "Choose a valid learning level.";
        }
        return "";
    }

    function openProfileForm(profileToEdit) {
        const isEdit = Boolean(profileToEdit);
        const profile = profileToEdit || {
            name: "",
            age: 6,
            learningLevel: "Beginner",
            avatar: "👧🏻"
        };

        const body = document.createElement("form");
        body.className = "module-panel profile-form";
        body.innerHTML = `
            <div class="module-controls">
                <label>Child name
                    <input id="profileName" type="text" maxlength="40" value="${window.SmartGrowApp.escapeHTML(profile.name)}" autocomplete="name">
                </label>
                <label>Age
                    <input id="profileAgeInput" type="number" min="3" max="17" step="1" value="${window.SmartGrowApp.escapeHTML(profile.age)}">
                </label>
            </div>
            <div class="module-controls">
                <label>Learning level
                    <select id="profileLevel">
                        ${["Beginner", "Developing", "Intermediate", "Advanced"].map(level =>
                            `<option ${level === profile.learningLevel ? "selected" : ""}>${level}</option>`
                        ).join("")}
                    </select>
                </label>
                <label>Avatar
                    <select id="profileAvatarInput">
                        ${avatars.map(avatar =>
                            `<option value="${avatar}" ${avatar === profile.avatar ? "selected" : ""}>${avatar}</option>`
                        ).join("")}
                    </select>
                </label>
            </div>
            <p id="profileFormError" class="module-feedback feedback-error" role="alert" hidden></p>
            <div class="module-actions">
                <button type="submit" class="generate-btn">${isEdit ? "Save Changes" : "Add Child"}</button>
                <button type="button" class="generate-btn secondary-btn" id="cancelProfileForm">Cancel</button>
            </div>
        `;

        window.SmartGrowApp.openModal({
            title: isEdit ? "Edit Child Profile" : "Add Child Profile",
            description: "Update the profile used by the child dashboard.",
            body,
            actions: []
        });

        body.querySelector("#cancelProfileForm").addEventListener("click", () => {
            window.SmartGrowApp.closeModal();
        });
        body.addEventListener("submit", event => {
            event.preventDefault();
            const values = {
                name: body.querySelector("#profileName").value,
                age: body.querySelector("#profileAgeInput").value,
                learningLevel: body.querySelector("#profileLevel").value,
                avatar: body.querySelector("#profileAvatarInput").value
            };
            const error = validateProfile(values);
            if (error) {
                const errorElement = body.querySelector("#profileFormError");
                errorElement.textContent = error;
                errorElement.hidden = false;
                return;
            }
            values.name = values.name.trim();

            const data = window.SmartGrowStorage.getData();
            let profiles = ensureProfiles(data);
            let savedProfile;
            if (isEdit) {
                profiles = profiles.map(profileItem =>
                    profileItem.id === profileToEdit.id
                        ? { ...profileItem, ...values, age: Number(values.age), active: true }
                        : { ...profileItem, active: false }
                );
                savedProfile = profiles.find(profileItem => profileItem.id === profileToEdit.id);
            } else {
                const id = `child-${Date.now()}`;
                savedProfile = {
                    id,
                    name: values.name.trim(),
                    age: Number(values.age),
                    learningLevel: values.learningLevel,
                    avatar: values.avatar,
                    active: true
                };
                profiles = profiles.map(profileItem => ({ ...profileItem, active: false }));
                profiles.push(savedProfile);
            }

            window.SmartGrowStorage.updateData("childProfiles", profiles);
            window.SmartGrowStorage.updateData("childProfile", {
                name: savedProfile.name,
                age: savedProfile.age,
                learningLevel: savedProfile.learningLevel,
                avatar: savedProfile.avatar
            });
            window.SmartGrowApp.closeModal();
            window.SmartGrowApp.notify(
                isEdit ? "Child profile updated." : "Child profile added and activated.",
                "success"
            );
            renderProfilesView();
        });
    }

    function renderProfilesView() {
        const utilityContent = document.getElementById("utilityContent");
        const utilityTitle = document.getElementById("utilityTitle");
        const utilityDescription = document.getElementById("utilityDescription");
        if (!utilityContent || !utilityTitle || !utilityDescription) return;

        utilityTitle.textContent = "Child Profiles";
        utilityDescription.textContent = "Add, edit, or activate a child profile.";
        utilityContent.replaceChildren();

        const data = window.SmartGrowStorage.getData();
        const profiles = ensureProfiles(data);
        const container = document.createElement("div");
        container.className = "module-list";

        profiles.forEach(profile => {
            const card = document.createElement("article");
            card.className = "module-card";
            card.innerHTML = `
                <div class="profile-card-summary">
                    <span class="module-card-icon">${window.SmartGrowApp.escapeHTML(profile.avatar)}</span>
                    <div>
                        <h3>${window.SmartGrowApp.escapeHTML(profile.name)} ${profile.active ? "(Active)" : ""}</h3>
                        <p>Age ${window.SmartGrowApp.escapeHTML(profile.age)} • ${window.SmartGrowApp.escapeHTML(profile.learningLevel)}</p>
                    </div>
                </div>
                <div class="module-actions">
                    ${profile.active ? "" : `<button type="button" class="generate-btn secondary-btn" data-activate-profile="${window.SmartGrowApp.escapeHTML(profile.id)}">Activate</button>`}
                    <button type="button" class="generate-btn" data-edit-profile="${window.SmartGrowApp.escapeHTML(profile.id)}">Edit</button>
                </div>
            `;
            container.appendChild(card);
        });

        const addButton = document.createElement("button");
        addButton.type = "button";
        addButton.className = "generate-btn";
        addButton.textContent = "＋ Add Child Profile";
        addButton.addEventListener("click", () => openProfileForm(null));
        container.appendChild(addButton);
        utilityContent.appendChild(container);

        container.querySelectorAll("[data-edit-profile]").forEach(button => {
            button.addEventListener("click", () => {
                const profile = profiles.find(item => item.id === button.dataset.editProfile);
                if (profile) openProfileForm(profile);
            });
        });
        container.querySelectorAll("[data-activate-profile]").forEach(button => {
            button.addEventListener("click", () => {
                const nextProfiles = profiles.map(profile =>
                    ({ ...profile, active: profile.id === button.dataset.activateProfile })
                );
                const activeProfile = nextProfiles.find(profile => profile.active);
                window.SmartGrowStorage.updateData("childProfiles", nextProfiles);
                window.SmartGrowStorage.updateData("childProfile", {
                    name: activeProfile.name,
                    age: activeProfile.age,
                    learningLevel: activeProfile.learningLevel,
                    avatar: activeProfile.avatar
                });
                window.SmartGrowApp.notify(`${activeProfile.name}'s profile activated.`, "success");
                renderProfilesView();
            });
        });
    }

    function initialize() {
        if (initialized) return;
        initialized = true;
        if (!window.SmartGrowStorage) return;

        const editButton = document.getElementById("editChildProfile");
        if (editButton) {
            editButton.setAttribute("data-profile-bound", "true");
        }

        window.addEventListener("smartgrow:navigate", event => {
            if (event.detail && event.detail.route === "profiles") {
                window.requestAnimationFrame(renderProfilesView);
            }
        });

        window.SmartGrowStorage.subscribe(data => {
            const activeProfile = getActiveProfile(data);
            const heading = document.getElementById("childProfileHeading");
            const age = document.getElementById("childAgeText");
            const level = document.getElementById("childLevelText");
            if (heading) heading.textContent = `${activeProfile.name}'s Profile`;
            if (age) age.textContent = `Age: ${activeProfile.age} years`;
            if (level) level.textContent = `Learning Level: ${activeProfile.learningLevel}`;
        });
    }

    window.SmartGrowProfile = {
        initialize,
        openProfileForm,
        renderProfilesView,
        getActiveProfile
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
