# Mulberry — High-Density Material Design 3 Frontend Design Specification

This document serves as a granular **Design Specification & Style Guide** for frontend UI/UX engineers to adopt and implement the **Mulberry** high-density Material Design 3 (M3) redesign. It outlines color hex codes, typographic scales, spacing metrics, interactive component states, and exact HTML/CSS blueprints.

---

## 1. Core Token System (CSS Variables)

To establish a unified M3 Dark design language, map the following variables inside `src/styles.css`. This system replaces all flashy eggplant gradients and glowing drop-shadows with professional, flat, elevated slate tokens.

### 🎨 Color Palette & Semantics

| Token Role | CSS Variable | Hex Code | Visual Application |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `--md-sys-color-background` | `#121318` | Root app background, HTML body |
| **Surface Layer 1 (Card)** | `--md-sys-color-surface` | `#1b1b1f` | Default cards, lists, table containers |
| **Surface Layer 2 (Elevated)**| `--md-sys-color-surface-container`| `#232429` | Modals, panels, drop-downs, search inputs |
| **Primary Accent (Active)** | `--md-sys-color-primary` | `#a8c7fa` | Active buttons, selected player pills, active tabs |
| **On-Primary (Text/Icon)** | `--md-sys-color-on-primary` | `#062e6f` | Text and icons placed on top of primary accent |
| **Secondary Container** | `--md-sys-color-secondary-container`| `#3d4758` | Subtitle badges, auxiliary indicators |
| **On-Secondary Container** | `--md-sys-color-on-secondary-container`| `#d7e3f8` | Text placed on top of secondary containers |
| **Neutral Outline** | `--md-sys-color-outline` | `#8c9099` | Thin card borders, input borders, structural dividers |
| **Subtle Divider** | `--md-sys-color-outline-variant` | `#43474e` | Soft row borders, unselected player pill outlines |
| **Semantic Success (Win)** | `--md-sys-color-success` | `#73f0b8` | Positive scores, settled badges, profit indicators |
| **Semantic Error (Loss)** | `--md-sys-color-error` | `#ff8fa3` | Negative scores, delete triggers, deficit indicators |

```css
/* Color Palette Mapping Spec */
:root {
  --md-sys-color-background: #121318;
  --md-sys-color-surface: #1b1b1f;
  --md-sys-color-surface-container: #232429;
  --md-sys-color-primary: #a8c7fa;
  --md-sys-color-on-primary: #062e6f;
  --md-sys-color-secondary-container: #3d4758;
  --md-sys-color-on-secondary-container: #d7e3f8;
  --md-sys-color-outline: #8c9099;
  --md-sys-color-outline-variant: #43474e;
  --md-sys-color-success: #73f0b8;
  --md-sys-color-error: #ff8fa3;
}
```

---

### 📐 Spacing & Density Tokens
For compact mobile-first layouts, shrink standard paddings. Spacing uses a base-4 geometric progression:

```css
:root {
  --space-xxs: 0.125rem; /* 2px */
  --space-xs: 0.25rem;   /* 4px */
  --space-sm: 0.5rem;    /* 8px */
  --space-md: 0.75rem;   /* 12px */
  --space-lg: 1rem;      /* 16px */
  --space-xl: 1.25rem;   /* 20px */
}
```

---

### ⦚ Geometry & Elevation (Borders, Radius, Shadows)
To ensure professional alignment, use flat aesthetics with crisp outlines and small, functional shadows:

```css
:root {
  /* Corner Radius Scale */
  --radius-card: 12px;       /* Cards, modals, standing tables */
  --radius-control: 8px;     /* Text inputs, buttons, selects */
  --radius-pill: 999px;      /* Player pills, status badges */
  
  /* Borders */
  --border-width: 1px;
  
  /* Minimal Flat Shadows (No Neon Glows) */
  --shadow-elevation-1: 0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.12);
  --shadow-elevation-2: 0 3px 6px rgba(0, 0, 0, 0.23), 0 3px 6px rgba(0, 0, 0, 0.16);
}
```

---

## 2. Typographic Scale

To maintain clean hierarchy in text-heavy score screens, typography is set to a crisp sans-serif face (Inter or Roboto, falling back to system sans-serif) and IBM Plex Mono for clean numeric tabulation.

```css
:root {
  --font-sans: "Inter", "Roboto", system-ui, -apple-system, sans-serif;
  --font-mono: "IBM Plex Mono", menlo, monospace;
}
```

### Font Metrics Spec Sheet

| Class Role | Font Family | Size (px / rem) | Weight | Line Height | Letter Spacing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Headline Large** | `var(--font-sans)` | `24px / 1.5rem` | `700 (Bold)` | `1.15` | `-0.02em` |
| **Headline Medium** | `var(--font-sans)` | `18px / 1.125rem` | `600 (Semi-Bold)`| `1.2` | `-0.01em` |
| **Title / Label** | `var(--font-sans)` | `14px / 0.875rem` | `600 (Semi-Bold)`| `1.3` | `0.01em` |
| **Body Standard** | `var(--font-sans)` | `14px / 0.875rem` | `400 (Regular)` | `1.45` | `0` |
| **Body Secondary / Muted**| `var(--font-sans)` | `12px / 0.75rem` | `400 (Regular)` | `1.4` | `0.02em` |
| **Caption / Eyebrow** | `var(--font-sans)` | `10px / 0.625rem` | `600 (Semi-Bold)`| `1.2` | `0.08em (Uppercase)`|
| **Numeric Standings** | `var(--font-mono)` | `13px / 0.8125rem`| `600 (Semi-Bold)`| `1` | `font-variant-numeric: tabular-nums` |

---

## 3. Reusable UI Components Spec

### 🏷️ A. Player Pill Component
A variable-width component representing a player. It must be robust enough to handle long Latin text and non-Latin unicode characters without wrapping or cutting off awkwardly.

```
+----------------------------------------+
| [✓]  [Optional NBA Headshot] Player Name |
+----------------------------------------+
```

#### HTML Structure Blueprint
```html
<button type="button" class="player-pill player-pill-selected">
  <!-- Checkmark icon visible ONLY when selected -->
  <span class="pill-check-icon">✓</span>
  
  <!-- Tiny NBA avatar visible ONLY in basketball dashboard when matched -->
  <img src="nba-headshot-url" alt="NBA Comparator" class="avatar-tiny" />
  
  <span class="pill-name">김철수</span>
</button>
```

#### Detailed CSS Specification
```css
.player-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px; /* High density height */
  padding: 0 10px;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: transparent;
  color: var(--md-sys-color-on-background);
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  transition: all 120ms cubic-bezier(0.2, 0, 0, 1);
}

/* Interactive States */
.player-pill:hover:not(:disabled) {
  background: rgba(168, 199, 250, 0.08); /* 8% Primary color blend */
  border-color: var(--md-sys-color-primary);
}

.player-pill:active:not(:disabled) {
  transform: scale(0.96); /* Micro-feedback press scale */
}

/* Selected State */
.player-pill-selected {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border-color: var(--md-sys-color-primary);
  font-weight: 600;
  box-shadow: var(--shadow-elevation-1);
}

.player-pill-selected:hover {
  background: #90b3f5; /* Slightly darker selected hover */
}

/* Tiny Matched NBA Avatar inside Pill */
.avatar-tiny {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--md-sys-color-on-primary);
  object-fit: cover;
  flex-shrink: 0;
}
```

---

### 🔍 B. "Add Players" Roster Selector Drawer
Designed to act as a space-efficient popover or inline panel to add players from a roster of **60+ players** instantly.

```
+-------------------------------------------------+
|  Add Players                      [X Done]     |
|  [🔍 Search player...                        ]  |
|  +-------------------------------------------+  |
|  | [✓ Qiang Liu] [✓ Emma S.] [김철수]         |  |
|  | [Raj Patel] [Fatima A.] [Sophie Dubois]   |  |
|  +-------------------------------------------+  |
+-------------------------------------------------+
```

#### Layout Blueprint & Spacing
* **Header Row:** Flat flex-row container, height `36px`, housing title and compact `Done` button.
* **Search Input Container:** Margin-bottom `8px`.
* **Player Pills Box:**
  * Displays as a `flex-row` with `flex-wrap: wrap`.
  * Spacing gap: `6px` (`gap: 6px`).
  * Max height: `150px`.
  * Vertical scrollbar enabled (`overflow-y: auto`).
  * Standard M3 styling for scrollbars (thin, grey track).

#### Detailed Component CSS Specs
```css
.add-players-drawer {
  background: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--radius-card);
  padding: 12px;
  box-shadow: var(--shadow-elevation-2);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-bar-compact {
  width: 100%;
  height: 32px; /* Super compact M3 height */
  padding: 0 10px;
  border-radius: var(--radius-control);
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline);
  color: var(--md-sys-color-on-background);
  font-family: var(--font-sans);
  font-size: 13px;
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.search-bar-compact:focus {
  border-color: var(--md-sys-color-primary);
  box-shadow: 0 0 0 2px rgba(168, 199, 250, 0.25);
}
```

#### Predictive Roster Ranking Spec
* When the drawer opens, available players are sorted *in-memory* before rendering:
  ```js
  // Sorting Algorithm: Predictive Round Stats
  const sortedRoster = [...availablePlayers].sort((playerA, playerB) => {
    // 1. Primary Sort: Rounds played in current gameType (descending)
    const roundsA = playerA.roundCountByGameType[gameTypeId] || 0;
    const roundsB = playerB.roundCountByGameType[gameTypeId] || 0;
    if (roundsB !== roundsA) return roundsB - roundsA;
    
    // 2. Secondary Sort: Alphabetic localeCompare (ascending)
    return playerA.displayName.localeCompare(playerB.displayName, undefined, { sensitivity: "base" });
  });
  ```
* This ensures that the active circle is displayed under the unsearched roster view, preventing scrolling.

---

### 🏀 C. High-Density Standings Table
A compact, data-dense, multi-column standing grid, displaying 16 rows and all metrics on standard phone screens.

#### Column Grid Specifications
* **Row Height:** `34px` total height.
* **Cell Padding:** `0.3rem 0.4rem` (`4.8px 6.4px`).
* **Table Layout:** `table-layout: fixed`.

```
+--------------------------------------------------------------+
| Rank  Player        GP   W   L   Win%   Pct.   PF   PA  Div  |
|--------------------------------------------------------------|
| 1     [🏀] Alex R.  24  19   2   .653  0.73   203  184  0-1  |
+--------------------------------------------------------------+
```

#### Detailed CSS Specification
```css
.standings-table-container {
  overflow-x: auto;
  border-radius: var(--radius-card);
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface);
}

.standings-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-sans);
  font-size: 12px;
}

.standings-table th {
  height: 32px;
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-outline);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.05em;
  padding: 0 6px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.standings-table td {
  height: 34px;
  padding: 0 6px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  vertical-align: middle;
}

.standings-table tbody tr:hover td {
  background: rgba(168, 199, 250, 0.04); /* Subtle hover highlight */
}

/* Numeric Columns Spec */
.standings-table td.numeric {
  font-family: var(--font-mono);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

/* Tiny Matched NBA Star Portrait */
.avatar-nba-inline {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.5px solid var(--md-sys-color-primary);
  display: inline-block;
  vertical-align: middle;
  margin-right: 6px;
  object-fit: cover;
}
```

---

## 4. Layout & Spacing Rules

To keep the application highly cohesive, apply the following layout specs:

### 📱 A. High-Density Form Spacing
Forms currently use a grid or vertical list format. Apply these tight margins to maximize screen height:
* **Form Grid Gap:** `8px` (`grid-gap: 8px`).
* **Input-to-Label Spacing:** `4px` (`margin-bottom: 4px`).
* **Section-to-Section Spacing:** `12px` (`margin-bottom: 12px`).

### 📱 B. Mobile Responsive Container Gaps
* Standard mobile padding around cards is reduced from `16px` to `12px`.
* Desktop responsive viewports (width >= `720px`) switch cards into a two-column grid using standard flexible auto-fill columns: `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`.

---

## 5. Transition & Animation Guidelines

Micro-feedback is highly effective for enhancing user experience. Align transitions with the **Material Design 3 motion specification**:

### Easing Curves
* **Standard Easing (Decelerate):** `cubic-bezier(0.2, 0, 0, 1)` (used for general transitions like drawer sliding and tabs switching).
* **Accelerate Curve (Outgoing):** `cubic-bezier(0.3, 0, 1, 1)` (used when collapsing drawers or hiding popups).

### Motion Durations
* **Fast / Instant:** `120ms` (for hover state transitions, color changes, active pill highlights).
* **Base Motion:** `180ms` (for drawers sliding out, modals popping, and list sorting transitions).
* **Detailed / Emphasis:** `240ms` (for page view transitions).

---

## 6. Adoption Checklist for UI Engineers

When adopting these styles into the codebase, follow this checklist:

1. [ ] **Map M3 Colors:** Replace custom purple codes in `styles.css` with the new slate M3 `--md-sys-color-*` palette variables.
2. [ ] **Shrink standard dimensions:** Update heights of `.tab-link`, `.primary-button`, `.secondary-button`, `input`, and `select` to `2.1rem` (or standard compact values) and check alignment.
3. [ ] **Integrate Full-Name Player Pills:** Stop character slicing or initials calculations. Replace initials circles with `PlayerPill` buttons.
4. [ ] **Upgrade the Add Players modal:** Implement the predictive rounds-ranked sorting algorithm in React and replace checklists with the new flow grid of pills.
5. [ ] **Condense the Basketball Board:** Adjust standing row padding down, and add `avatar-nba-inline` class inline to matched portraits. Ensure all stats columns align cleanly.
