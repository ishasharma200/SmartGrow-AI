# SmartGrow AI

SmartGrow AI is a child-friendly learning prototype with four guided learning activities and a parent dashboard. It runs in a web browser using local data storage; its stories and Talking Buddy responses are predefined simulations, not AI-generated content.

## Features

### Child dashboard

- Personalized child profile and daily activity summary.
- Learning progress indicator and earned achievement badges.
- Navigation to the four learning activities.

### Learning activities

- **Storyteller:** Create themed stories from age-appropriate templates, save favourites, mark stories complete, and use browser speech synthesis to read them aloud.
- **Play & Learn:** Answer multiple-choice questions across educational categories and difficulty levels, review scores, and keep quiz history.
- **Talking Buddy:** Have a simulated, child-friendly conversation, view saved chat history, and clear the current conversation.
- **Real-world activities:** Explore offline challenges, read instructions, and record completed activities.

### Parent dashboard

- View the active child profile and activity-derived learning statistics.
- Manage child profiles and review daily and weekly reports.
- Configure activity preferences, age-appropriate content, and screen-time limits.
- Review activity history, quiz performance, story completions, and achievements.
- Print or export available reports.

## Technology

- HTML5 and CSS3
- Vanilla JavaScript (no application framework or build step)
- Browser `localStorage` for profiles, settings, and activity records
- Browser Speech Synthesis API where available

## Project structure

```text
SMARTGROW/
├── index.html
├── README.md
├── assets/
│   ├── audio/
│   ├── icons/
│   └── images/
├── css/
│   ├── style.css
│   ├── dashboard.css
│   ├── features.css
│   └── responsive.css
└── js/
    ├── storage.js
    ├── navigation.js
    ├── app.js
    ├── storyteller.js
    ├── games.js
    ├── talking-buddy.js
    ├── real-world.js
    ├── parent-dashboard.js
    ├── profile.js
    └── reports.js
```

`storage.js` owns the shared versioned data structure. Feature scripts read and update that structure rather than maintaining separate stores. The CSS files separate base styles, dashboards, feature components, and responsive/print rules.

## Run locally

1. Open the `SMARTGROW` folder in VS Code.
2. Open `index.html` directly in a modern browser, or use the VS Code Live Server extension and open its local URL.
3. Use the Parent Dashboard and Child Profiles screens to configure the prototype.

No package installation, compilation, or API key is required.

## Limitations

- Data is stored in the current browser profile on the current device. Clearing site data or changing browsers/devices can remove or hide it.
- This prototype has no secure authentication, server-side storage, account recovery, or cloud synchronization. Do not store sensitive personal information in it.
- Story generation and Talking Buddy are local simulations. There is no live AI service, moderation service, or network-based content update.
- Screen time is an estimate based on activity while the app is open. It cannot reliably track time after the page/browser is closed, nor can a browser prototype enforce device-wide limits.
- Speech synthesis depends on browser and operating-system support and available voices. The app cannot guarantee audible playback on every device.
- Report export and printing depend on browser download and print support.

## Future work

A production version could add a secured backend for account authentication, consent and profile management, durable activity storage, and synchronization across devices. A real AI integration would require a backend-mediated API, age-appropriate moderation, privacy controls, and parent consent rather than exposing credentials in browser code. Reliable device-wide screen-time controls would require platform-level capabilities beyond this frontend.
