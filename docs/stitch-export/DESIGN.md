---
name: Kampus Lumina
colors:
  surface: '#131318'
  surface-dim: '#131318'
  surface-bright: '#39383e'
  surface-container-lowest: '#0e0e13'
  surface-container-low: '#1b1b20'
  surface-container: '#1f1f25'
  surface-container-high: '#2a292f'
  surface-container-highest: '#35343a'
  on-surface: '#e4e1e9'
  on-surface-variant: '#ccc3d8'
  inverse-surface: '#e4e1e9'
  inverse-on-surface: '#303036'
  outline: '#958da1'
  outline-variant: '#4a4455'
  surface-tint: '#d2bbff'
  primary: '#d2bbff'
  on-primary: '#3f008e'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#732ee4'
  secondary: '#cebdff'
  on-secondary: '#381385'
  secondary-container: '#4f319c'
  on-secondary-container: '#bea8ff'
  tertiary: '#ffb784'
  on-tertiary: '#4f2500'
  tertiary-container: '#a15100'
  on-tertiary-container: '#ffe0cd'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#e8ddff'
  secondary-fixed-dim: '#cebdff'
  on-secondary-fixed: '#21005e'
  on-secondary-fixed-variant: '#4f319c'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb784'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#713700'
  background: '#131318'
  on-background: '#e4e1e9'
  surface-variant: '#35343a'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  max-width-desktop: 1200px
  max-width-tablet: 768px
---

## Brand & Style

This design system embodies a premium, high-fidelity educational technology aesthetic. It targets a modern audience of learners and educators who value focus, clarity, and a sense of "digital sanctuary." The brand personality is intellectual, forward-thinking, and sophisticated.

The visual style is **Corporate Modern with Glassmorphism**. It utilizes deep, immersive dark backgrounds to reduce eye strain and focus the user's attention. Tactile depth is achieved through translucent layers, frosted glass effects, and subtle purple glows that evoke a sense of innovation and discovery. High-contrast typography ensures readability, while consistent 16px corner radii provide a friendly yet structured feel.

## Colors

The palette is centered on a "Deep Space" theme. The core background is a rich, near-black navy that provides an infinite canvas for learning.

- **Primary Purple (#7c3aed):** Used for primary actions, success states, and brand highlights. It represents wisdom and creativity.
- **Surface Tiers:** Backgrounds transition from the base `#0a0a0f` to a slightly lighter `#16161e` for cards and modals to create depth.
- **Glass Effects:** Overlays use white or purple with 4-10% opacity combined with high-saturation background blurs (20px-40px).
- **Accents:** Use vibrant purple glows (box-shadows with high spread and low opacity) to indicate active states or focus areas.

## Typography

This design system uses **Inter** exclusively to maintain a clean, systematic, and highly legible appearance across all screen sizes. 

- **Headlines:** Use a bold weight and slightly tighter letter spacing to create a strong visual anchor.
- **Body Text:** Standardizes on a 1.5x to 1.6x line height to ensure maximum readability for educational content and long-form instructions.
- **Labels:** Used for form headers and small navigation elements; the large label variant is uppercase to distinguish it from body text.
- **Hierarchy:** Primary content should always use white (`#FFFFFF`), while secondary descriptions use a muted gray (`#9ca3af`).

## Layout & Spacing

The layout follows a **Fluid Grid** model with strict vertical rhythm based on a 4px baseline unit.

- **Desktop:** 12-column grid with 24px gutters. Content is typically centered in a maximum 1200px container.
- **Tablet:** 8-column grid with 16px gutters and 32px side margins.
- **Mobile:** 4-column grid with 16px gutters and 16px side margins.
- **Spacing Logic:** Use `stack-md` (16px) for related elements (labels and inputs) and `stack-lg` (32px) to separate distinct sections (header and form body).

## Elevation & Depth

Hierarchy is established through **Backdrop Blurs and Tonal Layering**.

1.  **Base Layer:** Solid `#0a0a0f`.
2.  **Surface Layer (Cards/Modals):** Semi-transparent `#16161e` with a 0.5px solid border (`rgba(255,255,255,0.1)`). Apply a `backdrop-filter: blur(20px)` to create a glass effect.
3.  **Active Layer:** Elements requiring immediate attention (like primary buttons or active inputs) use a subtle outer glow. The glow should be the primary purple color with a 15-20px blur at 30% opacity.
4.  **Shadows:** Avoid traditional black shadows. Use "inner-light" borders (top-left 1px highlight) to simulate a light source from the top.

## Shapes

The shape language is consistently "Soft-Rounded."

- **Base Radius:** 8px (0.5rem) for small components like tags and checkboxes.
- **Container Radius:** 16px (1rem) for input fields and smaller buttons.
- **Section Radius:** 24px (1.5rem) for main content cards and modal containers.
- **Interactive Elements:** Buttons should never be fully pill-shaped; they should maintain the 16px radius to match the input fields, creating a unified block-like aesthetic for form groups.

## Components

### Buttons
- **Primary:** Solid purple background (`#7c3aed`) with white text. High-contrast. On hover, add a subtle white inner glow.
- **Secondary/Social:** Glass-style background (`rgba(255,255,255,0.05)`) with a 1px subtle border. Iconography (like the Google logo) should be vertically centered.

### Input Fields
- **Default State:** Deep navy background, 1px subtle border (`rgba(255,255,255,0.1)`), 16px radius.
- **Focus State:** Border changes to primary purple; add a subtle purple outer glow. Placeholder text should be muted gray (`#6b7280`).

### Cards
- Use the Glassmorphism style: semi-transparent background, backdrop blur, and a 16px-24px radius.
- Internal padding should be a minimum of 32px to create a spacious, high-end feel.

### Chips & Tags
- Used for categories or levels. Keep these small with an 8px radius and a slightly more vibrant purple tint to make them pop against the dark background.

### Lists & Navigation
- Hover states on list items should utilize a "reveal" effect where a subtle purple background tint appears behind the item.