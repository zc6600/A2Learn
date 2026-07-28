---
name: portfolio-design-system
description: Design system, UI style guide, component specifications, typography, color palette, responsive layout rules, micro-interactions, and content architecture methodology distilled from the portfolio website. Use this skill whenever creating, styling, or refactoring web applications to ensure a unified visual design language, high-end aesthetics, dark mode support, and structured content organization.
---

# Portfolio Design System & UI Style Guide

This skill documents the complete visual style system, component hierarchy, typography, color palette, layout rules, and content architecture methodology extracted from the modern tech portfolio project.

Use these guidelines and component patterns when building or refactoring any web project to ensure consistency, high visual polish, clean architecture, and structured content organization.

---

## 1. Design Philosophy & Visual Baseline

- **Style**: Modern, clean, tech-focused, and minimal.
- **Aesthetic Vibe**: Glassmorphism highlights, vibrant teal accents, polished dark mode contrast, smooth micro-interactions, clean cards, and crisp typography hierarchy.
- **Theme**: Seamless Light & Dark Mode support enabled via Tailwind `class` dark mode strategy.

---

## 2. Color System & Design Tokens

### Color Palette Matrix

| Tokens | Tailwind Class | Light Mode Hex / Equivalent | Dark Mode Hex / Equivalent | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Accent** | `teal-600` / `teal-500` / `teal-400` | `#0d9488` / `#14b8a6` | `#2dd4bf` / `#5eead4` | Primary CTAs, active links, hover states, logo accent |
| **Accent Gradient** | `from-teal-600 via-teal-500 to-teal-400` | Teal gradient | Teal gradient | Dynamic rotating text, hero highlights |
| **Page Background** | `bg-white` / `dark:bg-gray-900` | `#ffffff` | `#111827` (Gray-900) | Root body & main section background |
| **Card / Elevated Surface** | `bg-gray-50` / `dark:bg-gray-800` | `#f9fafb` (Gray-50) | `#1f2937` (Gray-800) | Project cards, inputs, drop-down wrappers |
| **Card Media Container** | `bg-white` / `dark:bg-gray-900/60` | `#ffffff` | `#111827` with 60% opacity | Project image aspect-ratio wrapper |
| **Borders** | `border-gray-200` / `dark:border-gray-800` | `#e5e7eb` | `#1f2937` / `#374151` | Divider lines, card outlines, input borders |
| **Primary Text** | `text-gray-900` / `dark:text-white` | `#111827` | `#ffffff` | Headings, card titles, main text bold |
| **Body Text** | `text-gray-700` / `dark:text-gray-300` | `#374151` | `#d1d5db` | Main prose paragraphs, body copy |
| **Muted Text / Subtitles**| `text-gray-500` / `dark:text-gray-400` | `#6b7280` | `#9ca3af` | Subheadings, descriptions, secondary icons |
| **Metadata / Mono Text**| `text-gray-400` / `dark:text-gray-500` | `#9ca3af` | `#6b7280` | Dates, timestamps, tags, toggle buttons |

### Tailwind Color Extension (`tailwind.config.mjs`)
```javascript
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
      animation: {
        'text-slide': 'text-slide 7.5s cubic-bezier(0.83, 0, 0.17, 1) infinite',
      },
      keyframes: {
        'text-slide': {
          '0%, 26.66%': { transform: 'translateY(0%)' },
          '33.33%, 60%': { transform: 'translateY(-25%)' },
          '66.66%, 93.33%': { transform: 'translateY(-50%)' },
          '100%': { transform: 'translateY(-75%)' },
        },
      },
    },
  },
  plugins: [],
}
```

---

## 3. Typography & Text Hierarchy

### Font Families Strategy
- **Sans-serif (Primary)**: Clean system sans stack (`Inter`, system UI font) for default interface elements, headings, buttons, and body.
- **Monospace (`font-mono`)**: Used for date tags (`2026-07-28`), metadata, slide counters, and collapsible expand labels.
- **Serif (`font-serif italic font-semibold`)**: Used specifically for emphasized inline quotes, key scientific terms, or thought highlights inside body copy (`<strong>` and `<em>`).

### Typography Rules & Utility Classes

| Role | Utility Classes | Sample Element | Key Attributes |
| :--- | :--- | :--- | :--- |
| **Section Title (`<h2>`)** | `text-4xl text-center uppercase dark:text-white mb-6 (or mb-8)` | `<h2 class="mb-8 text-center text-4xl dark:text-white uppercase"><a href="/#section" class="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">SECTION TITLE</a></h2>` | Uppercase, centered, anchor link with Teal hover transition |
| **Hero Title (`<h1>`)** | `text-4xl md:text-5xl xl:text-6xl font-extrabold` | `<h1><span class="block text-4xl md:text-5xl font-extrabold mb-2"><span class="text-gray-400 dark:text-gray-500 font-normal">Hi, I'm </span>Name</span></h1>` | Distinct prefix text styling + bold title |
| **Card Title (`<h3>`)** | `text-lg font-bold text-gray-900 dark:text-white` | `<h3 class="text-lg font-bold text-gray-900 dark:text-white">` | Compact card header |
| **Prose Paragraph (`<p>`)**| `text-base md:text-lg leading-relaxed text-gray-700 dark:text-gray-300` | `<p class="space-y-4 md:text-lg text-gray-700 dark:text-gray-300">` | Generous line height for high readability |
| **Timestamp / Metadata** | `text-xs font-mono font-medium text-gray-400 dark:text-gray-500` | `<span class="text-xs font-mono text-gray-400">Date</span>` | Subtle monospaced metadata badge |

---

## 4. Layout Architecture & Spacing Methodology

### Global Spacing & Layout Rules
1. **Root Page Structure**:
   - Smooth Scrolling: `<html lang="en" class="scroll-smooth">`
   - Sticky Header with Backdrop Blur: `sticky top-0 z-50 bg-white/50 backdrop-blur dark:bg-gray-900`
   - Main Container: `<main class="container">` (`mx-auto px-4 max-w-screen-xl`)
2. **Section Architecture**:
   - Anchor Scroll Offset: `scroll-mt-20` on all `<section id="...">` tags to prevent sticky nav overlapping titles when scrolling.
   - Vertical Section Spacing: `mb-12` or `mb-16` between page sections.
   - Content Columns: Content-heavy text sections (About, Thoughts, Now, Talks) are framed inside a centered column wrapper:
     ```html
     <div class="flex justify-center">
       <div class="w-full max-w-3xl border-t border-gray-200 dark:border-gray-700 pt-6">
         <!-- Content goes here -->
       </div>
     </div>
     ```
3. **Responsive Breakpoints**:
   - Mobile: Default single column layout (`grid-cols-1`, `flex-col`, `text-3xl`).
   - Medium (`md: 768px`): Multi-column split (`md:flex-row`, `md:grid-cols-2`, `md:text-4xl`).
   - Large (`lg: 1024px`) / Extra-Large (`xl: 1280px`): Full desktop hero typography and grid gaps.

---

## 5. Component Patterns & Specifications

### A. Navigation Header (Glassmorphic & Responsive)
- **Features**: Glassmorphic blur (`backdrop-blur bg-white/50`), brand name logo with first-letter Teal highlighting (`first-letter:text-teal-500`), mobile toggle menu with auto-collapse on item click.
- **Pattern**:
```html
<nav class="sticky top-0 z-50 bg-white/50 backdrop-blur dark:border-gray-600 dark:bg-gray-900">
  <div class="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between p-4">
    <!-- Brand Logo with first-letter accent -->
    <a href="/#home" class="flex items-center space-x-3">
      <span class="flex gap-2 text-2xl font-semibold">
        <span class="block first-letter:text-teal-500 dark:first-letter:text-teal-400">FirstName</span>
        <span class="block first-letter:text-teal-500 dark:first-letter:text-teal-400">LastName</span>
      </span>
    </a>
    <!-- Mobile Hamburger Toggle Button -->
    <button data-collapse-toggle="mobile-menu" type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-100 md:hidden dark:text-gray-400 dark:hover:bg-gray-700">
      <svg class="h-5 w-5" fill="none" viewBox="0 0 17 14"><path stroke="currentColor" stroke-width="2" d="M1 1h15M1 7h15M1 13h15"/></svg>
    </button>
    <!-- Nav Links -->
    <div id="mobile-menu" class="hidden w-full items-center justify-between font-medium md:order-1 md:flex md:w-auto">
      <ul class="mt-4 flex flex-col rounded-lg border border-gray-200 bg-gray-50 p-4 md:mt-0 md:flex-row md:space-x-8 md:border-0 md:bg-inherit md:p-0 dark:border-gray-700 dark:bg-gray-800 md:dark:bg-gray-900">
        <li>
          <a href="/#about" class="block rounded px-3 py-2 text-gray-900 hover:text-teal-600 dark:text-white dark:hover:text-teal-400 transition-colors">
            About
          </a>
        </li>
      </ul>
    </div>
  </div>
</nav>
```

---

### B. Split Hero with Dynamic Text-Slide Animation
- **Features**: 2-column layout, dynamic text carousel keyframe animation with gradient clip text, dual CTA buttons (Solid Primary & Outlined Border).
- **Pattern**:
```html
<section id="home" class="mb-8 flex min-h-[600px] dark:bg-gray-900">
  <div class="flex w-full flex-1 flex-col items-center justify-around md:flex-row">
    <!-- Left Column: Title & Dynamic Text -->
    <div class="place-self-center overflow-visible md:w-1/2">
      <h1 class="mb-4 leading-none tracking-tight text-gray-900 dark:text-white">
        <span class="block text-4xl md:text-5xl xl:text-6xl font-extrabold mb-2">
          <span class="text-gray-400 dark:text-gray-500 font-normal">Hi, I'm </span>John Doe
        </span>
        <span class="block text-2xl md:text-3xl xl:text-4xl font-semibold text-gray-500 dark:text-gray-400">
          I am passionate about
        </span>
      </h1>
      
      <!-- Sliding Animated Keyframe Carousel -->
      <div class="mb-8 text-3xl font-extrabold [text-wrap:balance] md:text-4xl lg:text-5xl">
        <div class="block h-[calc(theme(fontSize.3xl)*theme(lineHeight.tight))] overflow-hidden md:h-[calc(theme(fontSize.4xl)*theme(lineHeight.tight))] lg:h-[calc(theme(fontSize.5xl)*theme(lineHeight.tight))]">
          <ul class="block animate-text-slide text-left leading-tight">
            <li class="bg-gradient-to-r from-teal-600 via-teal-500 to-teal-400 bg-clip-text text-transparent">AI Agents</li>
            <li class="bg-gradient-to-r from-teal-600 via-teal-500 to-teal-400 bg-clip-text text-transparent">Web Development</li>
            <li class="bg-gradient-to-r from-teal-600 via-teal-500 to-teal-400 bg-clip-text text-transparent">System Design</li>
          </ul>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap gap-4">
        <!-- Solid Teal Button -->
        <a href="#projects" class="inline-flex items-center justify-center rounded-lg bg-teal-600 px-5 py-3 text-base font-medium text-white hover:bg-teal-500 transition-colors shadow-sm">
          Explore Projects
        </a>
        <!-- Border Outlined Button -->
        <a href="/resume.pdf" target="_blank" class="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-base font-medium text-gray-900 hover:bg-gray-100 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700">
          <span>Resume</span>
        </a>
      </div>
    </div>
    
    <!-- Right Column: Profile Image with Bottom Gradient Overlay -->
    <div class="relative md:w-1/2">
      <div class="mx-auto w-4/5">
        <img src="/profile.png" alt="Profile" class="w-full object-cover" />
      </div>
    </div>
  </div>
</section>
```

---

### C. Project Card Grid (Aspect Box & Hover Zoom)
- **Features**: Responsive 2-column grid, 16:10 fixed aspect ratio image box with dark contrast, hover zoom scale (`group-hover:scale-105`), bottom title bar with GitHub external link button (`bg-gray-900 dark:bg-teal-600`).
- **Pattern**:
```html
<section id="projects" class="min-h-[600px] scroll-mt-20 mb-12">
  <h2 class="mb-6 text-center text-4xl dark:text-white uppercase">
    <a href="/projects" class="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">PROJECTS</a>
  </h2>
  
  <ul class="grid grid-cols-1 md:grid-cols-2 gap-8">
    <li class="group relative w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 shadow-sm hover:shadow-md transition-all">
      <!-- Media Box -->
      <div class="aspect-[16/10] w-full p-4 flex items-center justify-center bg-white dark:bg-gray-900/60 overflow-hidden">
        <img src="/project.png" alt="Project Title" class="max-h-full w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-105 rounded-md" />
      </div>
      <!-- Card Footer Bar -->
      <div class="p-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">Project Title</h3>
        <a href="https://github.com/user/repo" target="_blank" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-semibold transition-all shadow-sm hover:scale-105">
          <span>GitHub ↗</span>
        </a>
      </div>
    </li>
  </ul>
</section>
```

---

### D. Skill Icons Matrix
- **Features**: Icon grid with scale effect on hover (`hover:scale-110`), standardized icon size (`w-16`), dynamic SVG icon integration.
- **Pattern**:
```html
<div class="w-full max-w-3xl grid grid-cols-2 sm:grid-cols-4 gap-6 py-6">
  <div title="Python" class="flex justify-center transition-transform hover:scale-110">
    <img class="block w-16" src="https://go-skill-icons.vercel.app/api/icons?i=python&titles=true" alt="Python" />
  </div>
</div>
```

---

### E. Micro-Blog / Thoughts Stream (Height Clamping & Collapsible Archive)
- **Features**:
  - Latest thought pinned at top with monospaced timestamp (`Latest · YYYY-MM-DD`).
  - Text Line Clamping with JS height measurement (`lineHeight * 2.2`).
  - Gradient Fade Mask overlay (`bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none`) when content exceeds 2 lines.
  - Interactive "Read more ↓ / Show less ↑" toggle button.
  - Collapsible older history section using `<details>` and `<summary>` with left border timeline accent (`border-l-2 border-gray-200 dark:border-gray-700 pl-4`).
- **Pattern**:
```html
<div class="thought-card">
  <span class="text-xs font-mono font-medium text-gray-400 dark:text-gray-500 block mb-2">Latest · 2026-07-28</span>
  <div class="thought-wrapper relative overflow-hidden transition-all duration-300">
    <p class="thought-text text-gray-800 dark:text-gray-200 text-base md:text-lg leading-relaxed font-normal">
      Thought content here...
    </p>
    <div class="thought-fade-mask absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none opacity-0"></div>
  </div>
  <button class="thought-toggle hidden text-xs font-mono text-gray-400 hover:underline mt-2">Read more ↓</button>
</div>

<!-- History Archive Accordion -->
<details class="group mt-6">
  <summary class="text-xs font-medium text-gray-400 hover:text-gray-600 cursor-pointer select-none py-1.5 flex items-center gap-1.5">
    View previous thoughts (3)
  </summary>
  <div class="mt-4 space-y-6 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
    <!-- Older items -->
  </div>
</details>
```

---

### F. Talks & Media Dropdown (Embedded PDF Preview)
- **Features**: Accordion item with direct download link, slide viewer link, and `<details>` dropdown holding an interactive `<iframe>` for embedded PDF preview (`#toolbar=0&navpanes=0`).
- **Pattern**:
```html
<div class="py-6 border-b border-gray-200 dark:border-gray-700">
  <h3 class="text-lg font-semibold dark:text-white">Talk Title</h3>
  <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Institution · 2026</p>
  <p class="text-gray-600 dark:text-gray-300 mt-3 text-sm leading-relaxed">Description...</p>
  <div class="flex gap-4 mt-4">
    <a href="/doc.pdf" target="_blank" class="text-sm text-teal-600 dark:text-teal-400 hover:underline">View slides →</a>
    <a href="/doc.pdf" download class="text-sm text-gray-500 hover:underline">Download PDF</a>
  </div>
  <details class="mt-5">
    <summary class="text-sm text-gray-400 cursor-pointer hover:text-gray-600 select-none">Preview slides</summary>
    <iframe src="/doc.pdf#toolbar=0&navpanes=0" class="w-full mt-3 rounded border border-gray-200 dark:border-gray-700 h-[480px]" title="Preview"></iframe>
  </details>
</div>
```

---

### G. Clean Contact Form & Mailto Fallback
- **Features**: 2-column split (Left info list with SVG icon badges, Right form inputs with crisp border & focus ring `focus:border-teal-500 focus:ring-teal-500`).
- **Submission Pattern**: Converts form fields into `mailto:` link format (`mailto:user@domain.com?subject=...&body=...`) to ensure reliable operation without backend server requirements.
- **Pattern**:
```html
<form id="contact-form" class="space-y-4">
  <div>
    <label for="name" class="mb-1.5 block text-sm font-medium text-gray-900 dark:text-white">Name</label>
    <input type="text" id="name" required class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900 focus:border-teal-500 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" placeholder="e.g. Alex Smith" />
  </div>
  <button type="submit" class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-500 transition-colors shadow-sm">
    Send Message
  </button>
</form>
```

---

## 6. Content Architecture & Methodology

### Data-Driven Architecture (`data.json` Schema)
Keep view component templates completely decoupled from content logic. All website content must be maintained in a structured `data.json` schema.

```json
{
  "metaData": {
    "title": "Role Title",
    "description": "Short meta description for SEO",
    "keywords": ["keyword1", "keyword2"]
  },
  "fullName": "First Last",
  "rotatingWords": ["Focus 1", "Focus 2", "Focus 3"],
  "aboutMe": [
    "Paragraph 1 text...",
    "Paragraph 2 with inline link marker <a href='#PROJECT:Project Name' class='inline-link'>Project Title</a>..."
  ],
  "skills": ["python", "typescript", "pytorch"],
  "projects": [
    {
      "imageSrc": "/project-1.png",
      "title": "Project Title",
      "codeSrc": "https://github.com/user/repo",
      "liveDemoURL": "https://demo.example.com"
    }
  ],
  "contact": {
    "email": "user@example.com",
    "location": "Location",
    "social": {
      "linkedin": "https://linkedin.com/in/...",
      "github": "https://github.com/..."
    }
  },
  "now": {
    "current": {
      "updated": "Month YYYY",
      "focus": ["Focus item 1", "Focus item 2"]
    },
    "archive": [
      { "period": "Past Period", "notes": "Archive note" }
    ]
  },
  "thoughts": [
    {
      "date": "YYYY-MM-DD",
      "content": "HTML string content with <strong>strong emphasis</strong>..."
    }
  ]
}
```

### Dynamic Inline Project Link Resolver Pattern
When rendering `aboutMe` or body paragraphs containing string templates referencing internal projects (e.g. `href='#PROJECT:Project Title'`), automatically resolve the lookup in the template logic:

```typescript
// Build lookup table: Project Title -> Link Href
const projectLink = Object.fromEntries(
  projects.map(p => [p.title, p.liveDemoURL || p.codeSrc])
)

// Dynamically replace token in paragraph HTML strings
const resolvedParagraphs = aboutMe.map(para =>
  para.replace(/href='#PROJECT:([^']+)'/g, (_, title) =>
    `href='${projectLink[title] ?? '#'}' target='_blank' rel='noopener noreferrer'`
  )
)
```

```css
/* Inline Link Style Specs */
.inline-link {
  @apply font-semibold underline underline-offset-2 hover:opacity-80 transition-all;
}
.inline-link::after {
  content: ' ↗';
  font-size: 0.85em;
}
```

---

## 7. Checklist for Creating New Projects with This Style

When initializing a new website project using this skill, check off each step:

1. [ ] **Tailwind Setup**: Configure dark mode strategy (`darkMode: 'class'`) and add the custom Teal color scale + `text-slide` animation keyframes.
2. [ ] **Typography**: Apply standard Sans system font stack for titles/body, `font-mono` for metadata/timestamps, and `font-serif italic font-semibold` for inline quotes.
3. [ ] **Color Palette**: Use `teal-600` / `teal-500` / `teal-400` as primary accent color, dark mode background `#111827` (`gray-900`), and elevated cards `#1f2937` (`gray-800`).
4. [ ] **Navigation Bar**: Implement `sticky top-0 z-50 bg-white/50 backdrop-blur` glassmorphism navigation header with first-letter Teal brand logo accent.
5. [ ] **Layout System**: Wrap content sections with `max-w-3xl` or `max-w-4xl` centered columns, `border-t border-gray-200 dark:border-gray-700 pt-6`, and `scroll-mt-20` for header clearance.
6. [ ] **Component Rules**:
   - Cards: `rounded-xl border shadow-sm hover:shadow-md aspect-[16/10] group-hover:scale-105`.
   - Section Titles: Centered `text-4xl uppercase` with Teal hover color.
   - Text Clamping: Max 2 lines height + bottom gradient fade mask + toggle button for expand/collapse.
7. [ ] **Data Architecture**: Store all content separately in `data.json` schema and use dynamic href string token replacers for cross-referencing.
