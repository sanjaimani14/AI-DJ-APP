# AI DJ — Autonomous Live DJ System: Official User & Operator Guide

Welcome to **AI DJ**, an autonomous live DJ performance system with dual-deck mixing, real-time Web Audio DSP, harmonic Camelot mixing, multi-mode automatic transitions, energy curve planning, and offline fail-safe safety watchdogs.

---

## Table of Contents
1. [Installation & Windows Standalone Launch](#1-installation--windows-standalone-launch)
2. [How to Import Music](#2-how-to-import-music)
3. [How to Analyze Music](#3-how-to-analyze-music)
4. [How to Start AI DJ Mode](#4-how-to-start-ai-dj-mode)
5. [Connecting Speakers & Audio Interfaces](#5-connecting-speakers--audio-interfaces)
6. [How to Use Live Event Mode (Stage HUD)](#6-how-to-use-live-event-mode-stage-hud)
7. [DJ Keyboard Shortcuts Reference](#7-dj-keyboard-shortcuts-reference)
8. [Emergency Stop](#8-emergency-stop)
9. [Offline Operation & Fallback Behavior](#9-offline-operation--fallback-behavior)
10. [Troubleshooting Guide](#10-troubleshooting-guide)

---

## 1. Installation & Windows Standalone Launch

### Option A: Direct Standalone Executable (Recommended for Windows)
1. Navigate to the project root directory: `g:\DJ APP\`.
2. Double-click **`AI-DJ.exe`** (or run `.\AI-DJ.exe` from PowerShell/Command Prompt).
3. The executable starts the production Web Audio HTTP server on `http://127.0.0.1:5173/`, supervises background feature analysis, and opens your default browser directly into the DJ console.

### Option B: Local Development / Node Server
```bash
cd "g:\DJ APP\frontend"
npm run build    # Produces production distribution bundle
npm run dev      # Launches Vite hot-reloading dev server
```
Open `http://localhost:5173` in any modern Chromium or WebAudio-capable browser.

---

## 2. How to Import Music

AI DJ supports high-fidelity audio decoding for **MP3, WAV, FLAC, M4A, AAC, and OGG**:
1. Click the **`IMPORT MUSIC`** button in the top-right of the Track Library (bottom section) or in the **Event Setup Wizard**.
2. Select individual audio files or multi-select entire folders.
3. Tracks will immediately appear in your library with instant client-side duration and metadata extraction.

---

## 3. How to Analyze Music

AI DJ performs deterministic audio feature extraction to empower Camelot harmonic mixing, BPM sync, and energy curve management:
- **Automatic Analysis**: Newly imported files are automatically analyzed through the audio processing pipeline.
- **Individual Re-analysis**: Click the **`REANALYZE`** button on any track row in the library to refresh BPM, Key, Beats, Energy, and LUFS loudness.
- **Batch Full-Library Re-analysis**: Click **`REANALYZE ALL`** above the track library to batch-process all songs with progress monitoring.
- **Offline / Corrupt File Protection**: If an audio file fails analysis or is corrupted, it is marked as `UNAVAILABLE` without freezing the interface, and safe fallbacks are applied.

---

## 4. How to Start AI DJ Mode

### One-Click Autonomous Mode
1. Ensure at least 2 tracks are loaded in the library.
2. In the **AI Panel** (or Top Bar), click **`START AUTONOMOUS DJ`** (or press keyboard shortcut **`A`**).
3. The system enters the continuous state machine:
   `IDLE` ➔ `PLAYING` ➔ `PREPARING_NEXT` ➔ `TRANSITIONING` ➔ `PLAYING_NEXT` ➔ `...`
4. The AI planner selects the next harmonic track, cues it to the opposite deck, aligns beat phases, ramps tempo, swaps EQ/filters, and performs seamless crossfades indefinitely without human intervention.

### Manual Assist Mode
1. In the AI Panel, switch the mode toggle to **`ASSIST`**.
2. The AI will recommend harmonic next tracks and transition types with compatibility match percentages.
3. Click **`APPLY DECISION`** or press **`T`** to execute the transition on command.

---

## 5. Connecting Speakers & Audio Interfaces

1. Plug in your external USB DJ controller, studio monitors, PA sound system, or multi-channel audio interface into your Windows machine.
2. Open Windows Sound Settings and verify your primary default output device.
3. In AI DJ:
   - Click **`EVENT SETUP`** on the Top Bar (or press **`S`**).
   - Under **OUTPUT DEVICE**, select your preferred device:
     * `Default - Speakers (Realtek Audio)`
     * `Headphones / DJ Cue Interface`
     * `External USB DJ Audio Interface`
     * `Virtual Audio Cable / Stream Output`
   - Master volume changes are automatically smoothed via 25ms Web Audio linear ramps to eliminate speaker pops and transients.

---

## 6. How to Use Live Event Mode (Stage HUD)

Designed for live nightclub, festival, and wedding environments where clarity is critical:
1. Click **`LIVE EVENT MODE`** on the Top Bar (or press keyboard shortcut **`L`**).
2. The interface expands into a high-visibility, simplified stage overlay:
   - **Large LIVE Status**: Flashing red active broadcast indicator.
   - **NOW PLAYING vs NEXT TRACK**: Giant title cards with Key, BPM, and Energy badges.
   - **Transition Countdown**: Real-time seconds and beat bars remaining until transition.
   - **System Telemetry**: AI Health, Audio DSP Health, CPU %, and Memory MB meters.
   - **Emergency Controls**: Prominent PAUSE, NEXT, STOP, and EMERGENCY STOP buttons.
3. Click **`EXIT LIVE HUD`** (or press **`L`**) to return to the studio workstation.

---

## 7. DJ Keyboard Shortcuts Reference

Tactile zero-latency keyboard hotkeys for real-time live performance:

| Key | Function | Category |
|---|---|---|
| **`Space`** | Toggle Play / Pause Active Deck | Global Transport |
| **`W`** | Play / Pause Deck A (Left) | Deck A Transport |
| **`Q`** | Jump to Cue Point Deck A | Deck A Cue |
| **`E`** | Beat & Tempo Sync Deck A to Deck B | Deck A Sync |
| **`[` / `]`** | Pitch Bend Deck A (- / + 5%) | Deck A Pitch |
| **`1, 2, 3, 4`** | Hot Cues 1–4 Deck A | Deck A Hot Cues |
| **`P`** | Play / Pause Deck B (Right) | Deck B Transport |
| **`O`** | Jump to Cue Point Deck B | Deck B Cue |
| **`I`** | Beat & Tempo Sync Deck B to Deck A | Deck B Sync |
| **`-` / `=`** | Pitch Bend Deck B (- / + 5%) | Deck B Pitch |
| **`7, 8, 9, 0`** | Hot Cues 1–4 Deck B | Deck B Hot Cues |
| **`←` / `→`** | Nudge Crossfader Left / Right (±10%) | Mixer |
| **`↓`** | Center Crossfader (Equal Power 0.0) | Mixer |
| **`T`** | Trigger / Force Automatic Transition | Transition Engine |
| **`A`** | Toggle Autonomous AI DJ Mode | AI Engine |
| **`L`** | Toggle Dedicated Live Stage HUD | Live View |
| **`S`** | Open Event Setup Wizard | Event Config |
| **`D`** | Open Session Log & Safety Diagnostics | Audit Log |
| **`?` or `H`** | Open Keyboard Shortcuts Reference | Help |
| **`Esc`** | **EMERGENCY STOP** (Instant Pause & Mute) | Safety |

---

## 8. Emergency Stop

If an unexpected feedback loop, speaker overload, or live performance emergency occurs:
- **Hardware Hotkey**: Press **`Escape`** anywhere in the application.
- **UI Button**: Click the glowing red **`EMERGENCY STOP`** button in the Live Stage HUD or Mixer.
- **Immediate Action**:
  1. Both audio decks are instantly stopped.
  2. Master volume and channel gains are muted to zero.
  3. The Autonomous state machine is deactivated.
  4. The event is timestamped and recorded in the Session Log.

---

## 9. Offline Operation & Fallback Behavior

AI DJ is built for zero-internet venue reliability:
- **No Cloud Dependency**: Audio DSP, crossfading, EQ, and time stretching operate 100% locally in browser memory.
- **Python / AI Backend Failure**: If the Python analysis microservice drops, the engine switches to the **Local Rule-Based Fallback Planner** (`smooth_crossfade`, Camelot cycle, energy-matching) with zero audio interruption.
- **Corrupted / Disappearing Tracks**: If an audio file fails to decode or a flash drive is unplugged, the engine detects the error within 4 seconds, skips the bad file, and loads the next healthy song in the library.
- **AudioContext Suspension**: If Windows puts the audio subsystem to sleep, the health watchdog auto-resumes the context within 1.5 seconds.

---

## 10. Troubleshooting Guide

| Problem | Cause | Solution |
|---|---|---|
| **No audio output** | Browser AudioContext suspended or master volume 0 | Click anywhere in the app to activate Web Audio; check Master Volume slider. |
| **Track won't load** | File format unsupported or corrupted | Ensure file is MP3, WAV, FLAC, M4A, or AAC. Check Event Log for decode errors. |
| **AI says "Standby"** | Library has fewer than 2 tracks | Import at least 2 tracks into the music library. |
| **Transition sounds abrupt** | Incompatible BPM or key gap | Switch to `Smooth Crossfade` or enable `Allow Energy Jumps` in Energy Manager. |
| **Port 5173 in use** | Another instance of AI-DJ or dev server is open | Close background node/vite processes or launch `AI-DJ.exe`. |
