---
name: Forest Minimalist
colors:
  surface: '#f9faf6'
  surface-dim: '#d9dad7'
  surface-bright: '#f9faf6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f0'
  surface-container: '#eeeeeb'
  surface-container-high: '#e8e8e5'
  surface-container-highest: '#e2e3df'
  on-surface: '#1a1c1a'
  on-surface-variant: '#414944'
  inverse-surface: '#2f312f'
  inverse-on-surface: '#f0f1ee'
  outline: '#717973'
  outline-variant: '#c1c8c2'
  surface-tint: '#3e6752'
  primary: '#002d1c'
  on-primary: '#ffffff'
  primary-container: '#1a4331'
  on-primary-container: '#85b098'
  inverse-primary: '#a4d0b8'
  secondary: '#58605e'
  on-secondary: '#ffffff'
  secondary-container: '#d9e1de'
  on-secondary-container: '#5c6462'
  tertiary: '#401a1a'
  on-tertiary: '#ffffff'
  tertiary-container: '#5a2f2e'
  on-tertiary-container: '#d29694'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c0edd3'
  primary-fixed-dim: '#a4d0b8'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#264e3c'
  secondary-fixed: '#dce4e1'
  secondary-fixed-dim: '#c0c8c5'
  on-secondary-fixed: '#161d1c'
  on-secondary-fixed-variant: '#404846'
  tertiary-fixed: '#ffdad8'
  tertiary-fixed-dim: '#f7b7b4'
  on-tertiary-fixed: '#331010'
  on-tertiary-fixed-variant: '#673a39'
  background: '#f9faf6'
  on-background: '#1a1c1a'
  surface-variant: '#e2e3df'
typography:
  h1:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 24px
  margin: 32px
---

## Brand & Style
The design system is anchored in a philosophy of "Productive Serenity." Designed for a management dashboard, it minimizes cognitive load by using vast whitespace and a restrained color palette. The aesthetic combines **Minimalism** with **Modern Corporate** sensibilities, focusing on clarity and high-quality spatial relationships. 

The target audience consists of administrators and managers who require a calm, focused environment to process complex data. The emotional response is intended to be one of organized confidence and quiet efficiency.

## Colors
This design system utilizes a high-contrast but naturalistic palette. 
- **Primary:** A "Deep Forest Green" used exclusively for primary actions, active states, and critical branding moments.
- **Secondary:** A very soft mint-tinted grey used for hover states and subtle highlights.
- **Neutral Background:** A clean, cool-toned grey that provides enough contrast to make white cards "pop."
- **Surfaces:** Pure white is reserved for cards and input fields to signify interactivity and data containers.
- **Text:** High-contrast charcoal (#111827) for headings and mid-tone slate (#4B5563) for body text.

## Typography
The system uses a dual-font approach. **Manrope** is used for headlines to provide a modern, slightly geometric warmth that differentiates the dashboard from standard utility apps. **Inter** is used for all functional UI elements, body text, and data points due to its exceptional legibility and neutral character.

Maintain generous line heights to prevent data-heavy screens from feeling cramped. Labels use a slight tracking (letter-spacing) increase to maintain readability at small sizes.

## Layout & Spacing
The design system employs a **Fixed Grid** model for the main content area, typically constrained to a 1440px max-width, while the sidebar remains fixed to the viewport. 

The rhythm is based on an 8px square grid. Gutters between cards are consistently 24px to allow the soft shadows room to breathe. Horizontal padding within cards should always be 24px or 32px to reinforce the "large" and "open" feeling of the brand.

## Elevation & Depth
Depth is achieved through **Ambient Shadows** and **Tonal Layering** rather than heavy borders. 
- **Level 0 (Background):** The soft grey background (#F9FAFB).
- **Level 1 (Cards):** Pure white surfaces with a very soft, diffused shadow (0px 4px 20px rgba(0, 0, 0, 0.03)) and a 1px border in a slightly darker grey (#F1F5F9).
- **Level 2 (Dropdowns/Modals):** Pure white with a more pronounced shadow (0px 10px 30px rgba(0, 0, 0, 0.08)) to indicate temporary overlay.

The "subtle border" is a critical architectural element—it defines the shape without adding visual weight.

## Shapes
The shape language is defined by large, friendly radii. 
- Standard components (buttons, inputs) use a **12px** radius.
- Primary containers (cards, dashboards panels) use a **16px** radius.
- Icons are placed within circular or highly rounded containers to maintain the soft aesthetic.

Avoid sharp 90-degree corners entirely to sustain the approachable and modern feel of the interface.

## Components
- **Cards:** The primary container. White fill, 1px #F1F5F9 border, 16px corner radius. Title areas should be separated by a subtle horizontal divider.
- **Buttons:** 
  - *Primary:* Deep Green background, white text, 12px radius. 
  - *Secondary:* Soft Mint (#E8F0ED) background, Deep Green text, no border.
- **Input Fields:** White background, 1px #E2E8F0 border, 12px radius. On focus, the border changes to Deep Green with a 2px soft glow.
- **Chips/Badges:** Small, 100px (pill) radius, using low-saturation background tints (e.g., light green for "Active", light amber for "Pending").
- **Lists:** Data rows should have ample vertical padding (16px+) and be separated by a light 1px line.
- **Sidebar:** A clean white or very light grey column with "Active" states indicated by a Deep Green vertical pill-shaped indicator on the left edge.