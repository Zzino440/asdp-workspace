---
name: ASDP Workspace
colors:
  surface: '#141218'
  surface-dim: '#141218'
  surface-bright: '#3b383f'
  surface-container-lowest: '#0f0d13'
  surface-container-low: '#1d1b21'
  surface-container: '#211f25'
  surface-container-high: '#2b292f'
  surface-container-highest: '#36343a'
  on-surface: '#e7e0e9'
  on-surface-variant: '#cac4d0'
  inverse-surface: '#e7e0e9'
  inverse-on-surface: '#322f36'
  outline: '#948f9a'
  outline-variant: '#49454f'
  surface-tint: '#d0bcff'
  primary: '#e9ddff'
  on-primary: '#37265e'
  primary-container: '#d0bcff'
  on-primary-container: '#594983'
  inverse-primary: '#665590'
  secondary: '#ccc2dc'
  on-secondary: '#332d41'
  secondary-container: '#4a4359'
  on-secondary-container: '#bab1ca'
  tertiary: '#ffd9e3'
  on-tertiary: '#492532'
  tertiary-container: '#efb8c8'
  on-tertiary-container: '#704654'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#210f48'
  on-primary-fixed-variant: '#4d3d76'
  secondary-fixed: '#e9def9'
  secondary-fixed-dim: '#ccc2dc'
  on-secondary-fixed: '#1e182b'
  on-secondary-fixed-variant: '#4a4359'
  tertiary-fixed: '#ffd9e3'
  tertiary-fixed-dim: '#efb8c8'
  on-tertiary-fixed: '#31111d'
  on-tertiary-fixed-variant: '#633b48'
  background: '#141218'
  on-background: '#e7e0e9'
  surface-variant: '#36343a'
typography:
  display-lg:
    fontFamily: Roboto Flex
    fontSize: 57px
    fontWeight: '400'
    lineHeight: 64px
    letterSpacing: -0.25px
  headline-lg:
    fontFamily: Roboto Flex
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: 0px
  headline-md:
    fontFamily: Roboto Flex
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: 0px
  headline-sm:
    fontFamily: Roboto Flex
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: 0px
  title-lg:
    fontFamily: Roboto Flex
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: 0px
  title-md:
    fontFamily: Roboto Flex
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0.15px
  title-sm:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.1px
  body-lg:
    fontFamily: Roboto Flex
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.5px
  body-md:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.25px
  body-sm:
    fontFamily: Roboto Flex
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.4px
  label-lg:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-md:
    fontFamily: Roboto Flex
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
  label-sm:
    fontFamily: Roboto Flex
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.2px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes an authoritative, precise, and focused developer-first environment tailored for DST's AI-Assisted Software Development Process (ASDP). Balancing enterprise rigor with modern developer-tool aesthetics, it bridges high-level project visibility with deep GitLab repository context.

The UI philosophy builds directly on Material Design 3 Dark Theme standards:
- **Atmosphere:** Deep violet-slate surfaces evoke a disciplined, low-fatigue workspace optimized for sustained desktop productivity.
- **Form Language:** Architectural precision governed by high-order roundedness (pills) for quick-glance contextual tokens, balanced by tightly structured surface containers.
- **Tone:** Technical, institutional, predictable, and unobtrusive. The interface recedes to spotlight codebase telemetry, pull request statuses, automated test outcomes, and phase deliverables.

## Colors

The palette is engineered strictly around Material Design 3 dark-theme mechanics, leveraging precise chromatic luminescences to separate workspace canvas tiers from interactive controls and state monitors.

### Core Tonal Palette
- **Primary (`#D0BCFF`):** High-priority interactive triggers, key indicators, active tabs, and primary action states.
- **On Primary (`#381E72`):** Text and iconography resting on Primary elements.
- **Primary Container (`#4F378B`):** Supporting interactive containers, selected states, and highlighted workflow phases.
- **On Primary Container (`#EADDFF`):** High-readability content within primary containers.
- **Secondary (`#CCC2DC`):** Secondary controls, metadata tags, and supplementary icons.
- **Secondary Container (`#4A4458`):** Unselected chip backgrounds, inactive container toggles, and muted button fills.
- **On Secondary Container (`#E8DEF8`):** Readable text and iconography resting on secondary containers.

### Surface Tiers & Boundaries
- **Surface (`#141218`):** Canvas backdrop and baseline viewport layer.
- **Surface Container Low (`#1D1B20`):** Full-bleed sidebars, collapsible repositories, and secondary panes.
- **Surface Container (`#211F26`):** Standard operational canvas, tables, and project cards.
- **Surface Container High (`#2B2930`):** Elevated modals, slide-out inspectors, popovers, and dialogs.
- **Surface Container Highest (`#36343B`):** Hover tiers, elevated tooltips, and distinct active table row fills.
- **Outline (`#938F99`):** Input field borders, inactive divider segments, and high-contrast structural borders.
- **Outline Variant (`#49454F`):** Subtle internal card dividers, table borders, and nested group separation.

### ASDP Document & Lifecycle States
Document states govern deliverable sign-offs and phase transitions across the GitLab repository pipeline:
- **Da fare (To Do):** Text `#E6E0E9`, Container `#36343B`, Border `#49454F` (Neutral slate tone).
- **In corso (In Progress):** Text `#A8C7FA`, Container `#004A77`, Border `#7C project blue` (Active technical blue).
- **Completo (Completed):** Text `#FFE082`, Container `#534200`, Border `#F5BF48` (Amber checkpoint awaiting sign-off).
- **Approvato (Approved):** Text `#8DD8A1`, Container `#0F5223`, Border `#8DD8A1` (Green verified state).

### Functional Feedback
- **Success (`#8DD8A1`):** Pipeline passes, merge completions, test suites validated.
- **Warning (`#F5BF48`):** Stale branches, impending deadlines, pending manual code reviews.
- **Error (`#F2B8B5`):** CI/CD failures, merge conflicts, blockages.

## Typography

The typography scale utilizes **Roboto Flex** across all structural hierarchy tiers to ensure systematic clarity and information density. For technical data—such as Git commit SHAs, file path traces, branch names, and AI prompt syntax—the system incorporates **JetBrains Mono**.

### Application Rules
- **Display & Headlines:** Used strictly for primary application headers, milestone progress overview pages, and enterprise project dashboards.
- **Titles & Subtitles:** Structure card modules, data grid columns, and drawer inspectors.
- **Body:** Standardized at `body-md` (14px) for descriptions, ASDP step summaries, and ticket contents, preserving comfort over long desk sessions.
- **Labels:** M3-standard button, chip, and badge typography.
- **Code Tokens:** Enforced for all repository links (`adsp/src/...`), terminal outputs, and automated pipeline outputs via `code-md` and `code-sm`.

## Layout & Spacing

The workspace uses a desktop-centric layout based on a standard 1440px viewport (scalable up to 1920px wide monitors). A strict **8px base spacing grid** governs macro layout, with a 4px sub-grid reserved for tight internal component paddings.

### Layout Architecture (1440px Desktop Target)
- **Global Navigation Bar:** Fixed top bar at 56px height.
- **ASDP Repository Sidebar:** Fixed-width 260px collapsible panel docked to the left canvas, anchored to `Surface Container Low`.
- **Primary Operational Area:** 12-column fluid grid spanning remaining width, constrained to a maximum content width of 1600px with centered margins.
- **Contextual Inspector:** 360px drawer docked to the right for task detail and AI prompt telemetry.
- **Gutters & Canvas Margins:** 24px (`1.5rem`) desktop gutters between primary content blocks and 32px (`2rem`) outer view boundaries.

### Content Density
ASDP workspace components favor moderate-to-compact data density. Tables, logs, and phase cards align to compact vertical strides (`space-sm` for inline badges and actions, `space-md` for card body padding, `space-lg` for structural separation).

## Elevation & Depth

Visual hierarchy does not rely on intense directional drop shadows; it is driven primarily by **Material 3 surface color tiers** reinforced by subtle, translucent boundaries.

### Depth Mechanics
1. **Level 0 (Base Canvas):** `Surface` (`#141218`) without borders or shadows.
2. **Level 1 (Card & Content Blocks):** `Surface Container` (`#211F26`) accompanied by a subtle hairline border using `Outline Variant` at 30% opacity (`rgba(73, 69, 79, 0.3)`).
3. **Level 2 (Active/Hover States & Dropdowns):** `Surface Container High` (`#2B2930`) with a diffuse, ambient shadow: `0px 4px 16px rgba(0, 0, 0, 0.45)`.
4. **Level 3 (Modals, Overlays & Command Palette):** `Surface Container Highest` (`#36343B`) with ambient elevation: `0px 12px 32px rgba(0, 0, 0, 0.65)` bordered by `Outline Variant` (`#49454F`).

### Focus and Active State Elevation
Elevated states never clip content. Focus indicators use a 2px offset border in `Primary` (`#D0BCFF`) without relying on drop shadow expansion.

## Shapes

The design system adopts a **pill-shaped form language** (Level 3 roundedness) for all action controls, badges, chips, and workflow status elements, creating clear contrast against the rectilinear layout of data tables and structural container panels.

### Shape Mapping
- **Pills (Full Radius):** Buttons, search inputs, filter chips, ASDP document status tags, avatar indicators, and phase progress capsules.
- **Surface Cards & Structural Containers (`rounded-lg`):** Panels, task containers, code view blocks, and modal windows use `2rem` (32px) or `1rem` (16px) depending on container nesting.
- **Nested Controls (`rounded`):** Checkboxes, form fields, and dropdown panels use `1rem` (16px) for interior containment.

## Components

### Buttons
- **Primary Button:** Pill-shaped (height: 40px), background `#D0BCFF`, text `#381E72` (`label-lg`, font weight 600). Hover state lightens to `#EADDFF`.
- **Secondary / Container Button:** Pill-shaped, background `#4F378B`, text `#EADDFF`.
- **Outlined Button:** Pill-shaped, background transparent, border 1px solid `#938F99`, text `#D0BCFF`.
- **Icon Button:** 40x40px circle, centered 20px glyph, hover introduces surface highlight using `rgba(208, 188, 255, 0.08)`.

### Chips & ASDP Document State Badges
- **Status Badges (Pills):** Height 24px, padding 0 12px, font `code-sm` or `label-sm`.
  - *Da fare:* Background `#36343B`, text `#E6E0E9`, outline 1px solid `#49454F`.
  - *In corso:* Background `#004A77`, text `#A8C7FA`, outline 1px solid `#00639B`.
  - *Completo:* Background `#534200`, text `#FFE082`, outline 1px solid `#F5BF48`.
  - *Approvato:* Background `#0F5223`, text `#8DD8A1`, outline 1px solid `#8DD8A1`.
- **Interactive Filter Chips:** Height 32px, pill-shaped, background `#2B2930`, border 1px solid `#49454F`. Selected state transitions to `#4F378B` with text `#EADDFF`.

### Input Fields & Search Bars
- **Desktop Search:** Full pill-shaped search bar, height 44px, background `Surface Container High` (`#2B2930`), placeholder text `Outline` (`#938F99`), leading search icon, trailing keyboard shortcut pill (`JetBrains Mono`, `⌘K`).
- **Form Text Inputs:** Height 48px, background `Surface Container` (`#211F26`), border 1px solid `Outline Variant` (`#49454F`), border-radius 12px. Active focus: 2px border in `Primary` (`#D0BCFF`).

### Checkboxes & Radio Buttons
- **Checkbox:** 18x18px, border-radius 4px. Unchecked: border 2px solid `#938F99`. Checked: fill `#D0BCFF`, checkmark icon `#381E72`.
- **Radio:** 18x18px pill circle. Active: concentric inner fill in `#D0BCFF`.

### Cards & Project Phase Containers
- **Phase Card:** Background `Surface Container` (`#211F26`), border-radius 16px, border 1px solid `Outline Variant` (`#49454F`) at 40% opacity. Internal padding: `space-md` (16px).
- **Header Structure:** Title `title-md`, top right aligned ASDP Document State Pill, footer displaying GitLab commit branch info (`JetBrains Mono`, 12px).

### Data Tables & Repository Tree
- **Table Headers:** `label-md` uppercase, text color `#CCC2DC`, background `Surface Container Low` (`#1D1B20`), bottom border 1px solid `#49454F`.
- **Table Rows:** Height 48px, horizontal divider 1px solid `rgba(73, 69, 79, 0.2)`. Row hover triggers `Surface Container High` (`#2B2930`).
