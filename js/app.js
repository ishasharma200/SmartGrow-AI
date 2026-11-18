
// Start Learning button
document.getElementById("startLearning").addEventListener("click", function () {
    alert("Welcome Mia! Your learning adventure starts now! 🌱");
});

// Navigate to Parent Dashboard
function showParentDashboard() {
    document.getElementById("parentDashboard").scrollIntoView({
        behavior: "smooth"
    });
}

// Save daily session limit
document.getElementById("saveLimit").addEventListener("click", function () {

    const limit = document.getElementById("sessionLimit").value;

    localStorage.setItem("dailySessionLimit", limit);

    document.getElementById("saveMessage").textContent =
        "Saved! Daily limit: " + limit + " minutes.";

});

// Load saved session limit
const savedLimit = localStorage.getItem("dailySessionLimit");

if (savedLimit) {
    document.getElementById("sessionLimit").value = savedLimit;
}

// Content safety setting
document.getElementById("safeContent").addEventListener("change", function () {

    const enabled = this.checked;

    localStorage.setItem("safeContent", enabled);

    alert(
        enabled
            ? "Age-appropriate content protection enabled."
            : "Content protection disabled."
    );

});

// Load content safety setting
const savedSafety = localStorage.getItem("safeContent");

if (savedSafety !== null) {
    document.getElementById("safeContent").checked =
        savedSafety === "true";
}
