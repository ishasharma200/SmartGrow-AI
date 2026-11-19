(function () {
    "use strict";

    const STORAGE_KEY = "smartgrowAiData";
    const LEGACY_KEYS = {
        dailySessionLimit: "parentSettings.dailyLimitMinutes",
        safeContent: "parentSettings.safeContent"
    };

    function createDefaultData() {
        return {
            version: 1,
            childProfile: {
                name: "Mia",
                age: 6,
                learningLevel: "Beginner",
                avatar: "👧🏻"
            },
            childProfiles: [{
                id: "primary",
                name: "Mia",
                age: 6,
                learningLevel: "Beginner",
                avatar: "👧🏻",
                active: true
            }],
            stories: [],
            quizAttempts: [],
            talkingBuddyConversations: [],
            completedRealWorldActivities: [],
            achievements: [],
            screenTimeSessions: [],
            activityHistory: [],
            learningProgress: {
                storyteller: { completed: 0, updatedAt: null },
                games: { completed: 0, updatedAt: null },
                talkingBuddy: { completed: 0, updatedAt: null },
                realWorld: { completed: 0, updatedAt: null }
            },
            parentSettings: {
                dailyLimitMinutes: 45,
                safeContent: true,
                bedtimeEnabled: false,
                bedtimeStart: "20:00",
                bedtimeEnd: "07:00"
            }
        };
    }

    function isObject(value) {
        return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    function mergeDefaults(defaultValue, storedValue) {
        if (Array.isArray(defaultValue)) {
            return Array.isArray(storedValue)
                ? storedValue.filter(isObject)
                : [];
        }
        if (isObject(defaultValue)) {
            const result = {};
            const source = isObject(storedValue) ? storedValue : {};
            Object.keys(defaultValue).forEach(key => {
                result[key] = mergeDefaults(defaultValue[key], source[key]);
            });
            Object.keys(source).forEach(key => {
                if (!Object.prototype.hasOwnProperty.call(result, key)) {
                    result[key] = source[key];
                }
            });
            return result;
        }
        return typeof storedValue === typeof defaultValue ? storedValue : defaultValue;
    }

    function getByPath(source, path) {
        if (!path) return undefined;
        return String(path).split(".").reduce((current, key) => (
            current && Object.prototype.hasOwnProperty.call(current, key)
                ? current[key]
                : undefined
        ), source);
    }

    function setByPath(source, path, value) {
        const keys = String(path).split(".").filter(Boolean);
        if (!keys.length) return false;
        let current = source;
        for (let index = 0; index < keys.length - 1; index += 1) {
            if (!isObject(current[keys[index]])) {
                current[keys[index]] = {};
            }
            current = current[keys[index]];
        }
        current[keys[keys.length - 1]] = value;
        return true;
    }

    function deleteByPath(source, path) {
        const keys = String(path).split(".").filter(Boolean);
        if (!keys.length) return false;
        let current = source;
        for (let index = 0; index < keys.length - 1; index += 1) {
            if (!current || !Object.prototype.hasOwnProperty.call(current, keys[index])) {
                return false;
            }
            current = current[keys[index]];
        }
        const key = keys[keys.length - 1];
        if (!Object.prototype.hasOwnProperty.call(current, key)) return false;
        delete current[key];
        return true;
    }

    let data = createDefaultData();
    const subscribers = new Set();

    function notify() {
        subscribers.forEach(callback => {
            try {
                callback(cloneData());
            } catch (error) {
                console.error("SmartGrow storage subscriber failed:", error);
            }
        });
    }

    function cloneData() {
        return JSON.parse(JSON.stringify(data));
    }

    function persist() {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            notify();
            return true;
        } catch (error) {
            console.error("SmartGrow could not save application data:", error);
            return false;
        }
    }

    function load() {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                data = createDefaultData();
                migrateLegacySettings();
                persist();
                return cloneData();
            }

            const parsed = JSON.parse(raw);
            if (!isObject(parsed)) throw new Error("Stored data is not an object.");
            data = mergeDefaults(createDefaultData(), parsed);
            migrateLegacySettings();
            persist();
            return cloneData();
        } catch (error) {
            console.error("SmartGrow found invalid stored data and restored safe defaults:", error);
            data = createDefaultData();
            migrateLegacySettings();
            persist();
            return cloneData();
        }
    }

    function migrateLegacySettings() {
        try {
            const savedLimit = window.localStorage.getItem("dailySessionLimit");
            if (savedLimit !== null) {
                const minutes = Number(savedLimit);
                if (Number.isFinite(minutes) && minutes > 0) {
                    data.parentSettings.dailyLimitMinutes = minutes;
                }
                window.localStorage.removeItem("dailySessionLimit");
            }

            const savedSafety = window.localStorage.getItem("safeContent");
            if (savedSafety !== null) {
                data.parentSettings.safeContent = savedSafety === "true";
                window.localStorage.removeItem("safeContent");
            }
        } catch (error) {
            console.error("SmartGrow could not migrate legacy settings:", error);
        }
    }

    function getLegacyValue(key) {
        const path = LEGACY_KEYS[key];
        if (!path) return null;
        const value = getByPath(data, path);
        return typeof value === "boolean" ? String(value) : String(value);
    }

    function setLegacyValue(key, value) {
        const path = LEGACY_KEYS[key];
        if (!path) return false;
        let converted = value;
        if (key === "dailySessionLimit") {
            const number = Number(value);
            if (!Number.isFinite(number) || number <= 0) return false;
            converted = number;
        }
        if (key === "safeContent") converted = value === true || value === "true";
        const updated = updateData(path, converted);
        if (updated) {
            try {
                window.localStorage.removeItem(key);
            } catch (error) {
                console.error("Could not remove legacy storage key:", error);
            }
        }
        return updated;
    }

    function getData(path) {
        if (typeof path === "string" && path) {
            return cloneValue(getByPath(data, path));
        }
        return cloneData();
    }

    function cloneValue(value) {
        if (value === undefined) return undefined;
        if (value === null || typeof value !== "object") return value;
        return JSON.parse(JSON.stringify(value));
    }

    function saveData(nextData) {
        if (!isObject(nextData)) {
            console.error("SmartGrow saveData expects an object.");
            return false;
        }
        data = mergeDefaults(createDefaultData(), nextData);
        return persist();
    }

    function updateData(path, valueOrUpdater) {
        if (typeof path !== "string" || !path.trim()) {
            console.error("SmartGrow updateData requires a valid path.");
            return false;
        }
        const existing = getByPath(data, path);
        const nextValue = typeof valueOrUpdater === "function"
            ? valueOrUpdater(cloneValue(existing))
            : valueOrUpdater;
        return setByPath(data, path, cloneValue(nextValue)) && persist();
    }

    function updateArray(path, item, index) {
        if (typeof path !== "string" || !path) return false;
        const current = getByPath(data, path);
        if (!Array.isArray(current)) return false;
        if (typeof index === "number") {
            if (index < 0 || index >= current.length) return false;
            current[index] = cloneValue(item);
        } else {
            current.push(cloneValue(item));
        }
        return persist();
    }

    function deleteData(path) {
        const defaultValue = getByPath(createDefaultData(), path);
        if (defaultValue !== undefined) {
            return setByPath(data, path, cloneValue(defaultValue)) && persist();
        }
        return deleteByPath(data, path) && persist();
    }

    function resetData() {
        data = createDefaultData();
        try {
            window.localStorage.removeItem("dailySessionLimit");
            window.localStorage.removeItem("safeContent");
        } catch (error) {
            console.error("SmartGrow could not clear legacy settings:", error);
        }
        const saved = persist();
        if (!saved) return false;
        return true;
    }

    function subscribe(callback) {
        if (typeof callback !== "function") return function () {};
        subscribers.add(callback);
        callback(cloneData());
        return function () {
            subscribers.delete(callback);
        };
    }

    window.SmartGrowStorage = {
        STORAGE_KEY,
        getDefaultData: createDefaultData,
        load,
        getData,
        read: getData,
        saveData,
        save: saveData,
        updateData,
        update: updateData,
        updateArray,
        deleteData,
        delete: deleteData,
        remove: deleteData,
        resetData,
        reset: resetData,
        subscribe,
        get(key) {
            if (Object.prototype.hasOwnProperty.call(LEGACY_KEYS, key)) {
                return getLegacyValue(key);
            }
            return window.localStorage.getItem(key);
        },
        set(key, value) {
            if (Object.prototype.hasOwnProperty.call(LEGACY_KEYS, key)) {
                return setLegacyValue(key, value);
            }
            try {
                window.localStorage.setItem(key, String(value));
                return true;
            } catch (error) {
                console.error("SmartGrow could not save a compatibility key:", error);
                return false;
            }
        }
    };

    load();

    window.addEventListener("storage", event => {
        if (event.key === STORAGE_KEY || event.key === null) {
            load();
        }
    });
})();
