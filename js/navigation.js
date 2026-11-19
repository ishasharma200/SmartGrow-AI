(function () {
    "use strict";

    let currentRoute = "child";
    let previousRoute = "child";
    let initialized = false;

    const routeToView = {
        child: "child",
        learning: "child",
        parent: "parent",
        profiles: "utility",
        settings: "utility",
        reports: "utility",
        help: "utility"
    };

    function setHash(route) {
        if (window.location.hash !== "#" + route) {
            window.history.replaceState({ route }, "", "#" + route);
        }
    }

    function getRouteFromHash() {
        const route = window.location.hash.replace("#", "").toLowerCase();
        return Object.prototype.hasOwnProperty.call(routeToView, route) ? route : "child";
    }

    function setActiveNavigation(route) {
        document.querySelectorAll("[data-route]").forEach(element => {
            const isActive = element.dataset.route === route ||
                (route === "learning" && element.dataset.route === "learning");
            element.classList.toggle("active", isActive);
            if (isActive) {
                element.setAttribute("aria-current", "page");
            } else {
                element.removeAttribute("aria-current");
            }
        });

        document.querySelectorAll(".nav-item").forEach(element => {
            element.classList.toggle("active", element.dataset.route === route);
            if (element.dataset.route === route) {
                element.setAttribute("aria-current", "page");
            } else {
                element.removeAttribute("aria-current");
            }
        });
    }

    function showView(viewName) {
        document.querySelectorAll(".app-view").forEach(view => {
            const shouldShow = view.dataset.view === viewName;
            view.hidden = !shouldShow;
        });
    }

    function focusCurrentView(route) {
        const viewName = routeToView[route];
        const view = document.querySelector(`[data-view="${viewName}"]`);
        if (!view) return;
        window.requestAnimationFrame(() => {
            view.focus({ preventScroll: true });
            if (route !== "learning") {
                view.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    }

    function navigate(route, options) {
        const settings = options || {};
        if (!Object.prototype.hasOwnProperty.call(routeToView, route)) return false;

        if (route !== currentRoute) previousRoute = currentRoute;
        currentRoute = route;
        showView(routeToView[route]);
        setHash(route);
        setActiveNavigation(route);

        if (route === "learning") {
            const childView = document.getElementById("childDashboard");
            const featureGrid = childView && childView.querySelector(".feature-grid");
            if (featureGrid) {
                window.requestAnimationFrame(() => {
                    featureGrid.scrollIntoView({ behavior: "smooth", block: "center" });
                });
            }
        }

        if (window.SmartGrowApp && typeof window.SmartGrowApp.showUtilityRoute === "function") {
            window.SmartGrowApp.showUtilityRoute(route);
        }

        if (settings.focus !== false) focusCurrentView(route);
        window.dispatchEvent(new CustomEvent("smartgrow:navigate", {
            detail: { route, previousRoute }
        }));
        return true;
    }

    function goBack() {
        if (previousRoute && previousRoute !== currentRoute) {
            navigate(previousRoute);
        } else {
            navigate("child");
        }
    }

    function openMobileNavigation() {
        if (!window.SmartGrowApp || typeof window.SmartGrowApp.openMobileMenu !== "function") return;
        window.SmartGrowApp.openMobileMenu();
    }

    function activateFeature(feature) {
        const preferenceKey = {
            storyteller: "storyteller",
            games: "games",
            buddy: "buddy",
            explore: "realWorld"
        }[feature];
        if (preferenceKey && window.SmartGrowStorage) {
            const settings = window.SmartGrowStorage.getData("parentSettings") || {};
            const preferences = settings.learningPreferences;
            if (preferences && preferences[preferenceKey] === false) {
                if (window.SmartGrowApp) {
                    window.SmartGrowApp.notify(
                        "A parent has paused this learning activity.",
                        "warning"
                    );
                }
                return;
            }
            const limit = Number(settings.dailyLimitMinutes);
            const restrictions = settings.restrictions || {};
            const trackedMinutes = window.SmartGrowParentDashboard
                ? window.SmartGrowParentDashboard.getCurrentTrackedMinutes()
                : 0;
            if (
                preferenceKey !== "realWorld" &&
                restrictions.restrictOfflineOnly === true &&
                Number.isFinite(limit) &&
                trackedMinutes >= limit
            ) {
                if (window.SmartGrowApp) {
                    window.SmartGrowApp.notify(
                        "Daily screen-time limit reached. Try an offline activity instead.",
                        "warning"
                    );
                }
                return;
            }
        }

        if (feature === "storyteller" && window.SmartGrowStoryteller) {
            window.SmartGrowStoryteller.open();
        } else if (feature === "parent") {
            navigate("parent");
        } else if (feature === "games" && window.SmartGrowGames) {
            window.SmartGrowGames.open();
        } else if (feature === "buddy" && window.SmartGrowTalkingBuddy) {
            window.SmartGrowTalkingBuddy.open();
        } else if (feature === "explore" && window.SmartGrowRealWorld) {
            window.SmartGrowRealWorld.open();
        } else if (window.SmartGrowApp) {
            window.SmartGrowApp.notify("This learning module is not available yet.", "warning");
        }
    }

    function initialize() {
        if (initialized) return;
        initialized = true;

        document.querySelectorAll("[data-route]").forEach(element => {
            element.addEventListener("click", event => {
                event.preventDefault();
                navigate(element.dataset.route);
            });
        });

        document.querySelectorAll("[data-feature]").forEach(element => {
            const activate = () => activateFeature(element.dataset.feature);
            element.addEventListener("click", activate);
            element.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    activate();
                }
            });
        });

        document.querySelectorAll("[data-mobile-menu]").forEach(button => {
            button.addEventListener("click", openMobileNavigation);
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && currentRoute !== "child" && currentRoute !== "parent") {
                goBack();
            }
        });

        window.addEventListener("popstate", () => navigate(getRouteFromHash(), { focus: false }));
        window.addEventListener("hashchange", () => navigate(getRouteFromHash(), { focus: false }));

        navigate(getRouteFromHash(), { focus: false });
    }

    window.SmartGrowNavigation = {
        initialize,
        navigate,
        goBack,
        getCurrentRoute: () => currentRoute,
        showView,
        activateFeature
    };
})();
