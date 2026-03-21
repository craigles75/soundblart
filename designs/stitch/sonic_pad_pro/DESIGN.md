# Design System Document: The Tactile Sonic Atelier

## 1. Overview & Creative North Star
### Creative North Star: "The Neon Neumorphic Studio"
This design system rejects the flat, sterile nature of modern utility apps in favor of a "Physical-Digital" hybrid. We are building a high-end instrument, not just a soundboard. The experience must feel like a custom-engineered physical console—tactile, responsive, and vibrating with energy.

The system breaks the "template" look through **intentional depth layering**. By using the dark mode base as a void, we treat the colorful sound pads as illuminated physical objects floating in a high-tech studio. We move beyond the grid by using oversized typography and asymmetrical padding to create an editorial, premium feel that prioritizes "The Performance" over "The Interface."

---

## 2. Colors
Our color philosophy is rooted in **Chromatic Functionalism**. Colors aren't just decorative; they are the primary navigation system.

### Surface Hierarchy & The "No-Line" Rule
*   **The No-Line Rule:** To maintain a premium, integrated aesthetic, **1px solid borders are strictly prohibited** for sectioning. Contrast must be achieved through background shifts.
*   **Surface Layering:**
    *   **Base Layer:** `surface` (#0e0e0e) for the global background.
    *   **Sectioning:** Use `surface_container_low` (#131313) for secondary content areas.
    *   **Primary Containers:** Use `surface_container` (#1a1a1a) to house the main sound pads.
*   **The "Glass & Gradient" Rule:** Floating controls (like volume sliders or transport bars) must use `surface_variant` (#262626) with a 60% opacity and a 20px backdrop-blur. 
*   **Signature Textures:** For the "pressable" sound pads, do not use flat fills. Use a subtle linear gradient from the core color (e.g., `primary` #ff8f6f) to its container variant (e.g., `primary_container` #ff7851) at a 145-degree angle to simulate overhead studio lighting.

---

## 3. Typography
We use a dual-typeface system to balance technical precision with high-fashion editorial impact.

*   **Display & Headlines (Space Grotesk):** This is our "Instrument Identity." Use `display-lg` and `headline-md` for sound group titles. The wide apertures and geometric construction feel modern and mechanical.
*   **Body & Labels (Plus Jakarta Sans):** Our "Utility" typeface. Its clean, humanist curves ensure legibility even at `label-sm` (0.6875rem) when tucked into the corners of a sound pad.
*   **Editorial Hierarchy:** Use high-contrast scaling. A `display-lg` sound group header should sit near a `label-md` metadata point to create a professional, "spec-sheet" aesthetic.

---

## 4. Elevation & Depth
In this design system, elevation is conveyed through **Tonal Layering** and **Inner Shadow Physics**.

*   **The Layering Principle:** Avoid traditional shadows. To make a card "lift," place a `surface_container_high` (#20201f) element onto the `surface` (#0e0e0e) background. 
*   **Tactile Sound Pads:** To achieve the "pressable" look:
    *   **Resting State:** An inner shadow (top-left) with 10% white (On-Surface) and an outer "Ambient Shadow" (bottom-right) using a 12% opacity of the pad's specific color.
    *   **Pressed State:** Remove the outer shadow and increase the inner shadow (top-left) opacity to 25%, creating a "pushed-in" physical effect.
*   **The Ghost Border Fallback:** If high-density layouts require a boundary, use `outline_variant` (#484847) at **15% opacity**. Never 100%.
*   **Ambient Shadows:** For floating Modals, use a blur radius of `32px` with a 6% opacity of `surface_tint`.

---

## 5. Components

### The Sound Pad (The Hero Component)
*   **Shape:** Use `roundedness-lg` (2rem) for the outer container.
*   **Internal Padding:** Use `spacing-4` (1.4rem) to give the label breathing room.
*   **Color Groups:**
    *   *Audience/Impact:* `primary` (#ff8f6f)
    *   *Nature/Ambient:* `secondary` (#91f78e)
    *   *Traffic/Urban:* `tertiary` (#44a5ff)
*   **Interaction:** On tap, the pad scale should shrink to 0.96x to reinforce the tactile physics.

### Global Transport Bar (Glass Component)
*   **Background:** `surface_variant` (#262626) at 70% opacity.
*   **Blur:** `backdrop-filter: blur(12px)`.
*   **Layout:** Use asymmetrical spacing—`spacing-6` on the leading edge and `spacing-4` on the trailing edge to break the "standard app" feel.

### Lists & Sound Banks
*   **Dividers:** **FORBIDDEN.** Separate list items using `spacing-2` (0.7rem) of vertical white space and a subtle shift from `surface_container_low` to `surface_container`.

### Action Chips
*   **Style:** Pill-shaped (`roundedness-full`). Use `surface_container_highest` for the background and `on_surface_variant` for the text to keep them secondary to the vibrant sound pads.

---

## 6. Do's and Don'ts

### Do:
*   **DO** use varying shades of the dark palette to define structure.
*   **DO** allow typography to bleed near the edges of containers for an editorial look.
*   **DO** use the `primary_fixed_dim` and `secondary_fixed_dim` colors for active toggle states to ensure they feel "illuminated."

### Don't:
*   **DON'T** use pure black (#000000) for anything other than `surface_container_lowest`. It kills the depth.
*   **DON'T** use 1px lines to separate sound pads. Let the color and the `spacing-3` gaps do the work.
*   **DON'T** use standard "Material Design" ripple effects. Use the "Physical Scale" interaction (shrinking/growing) to maintain the premium feel.
*   **DON'T** mix `spaceGrotesk` with `plusJakartaSans` in the same line of text. Keep their roles distinct and authoritative.