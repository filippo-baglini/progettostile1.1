---
name: Progetto Stile
description: An AI stylist that brings back whole outfits within budget, set in the fitting room after closing time.
colors:
  espresso-ground: "#0c0907"
  walnut-card: "#16110d"
  walnut-raised: "#211a14"
  linen-ink: "#f4ede5"
  taupe-muted: "#b5a696"
  taupe-faint: "#8a7c6e"
  cognac: "#d39a62"
  cognac-bright: "#e0ad78"
  cognac-ink: "#1f1207"
  stock-green: "#5fcf8f"
  budget-amber: "#e8b04a"
  sold-out-red: "#f07a6a"
  sand-ground: "#f3eee8"
  paper-card: "#ffffff"
  sand-raised: "#ebe4dc"
  roast-ink: "#1d150f"
  taupe-muted-light: "#6b5a4b"
  taupe-faint-light: "#786656"
  cognac-deep: "#8a5523"
  cognac-deeper: "#73441a"
  stock-green-light: "#13834a"
  budget-amber-light: "#a86a0c"
  sold-out-red-light: "#c4321f"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(2.625rem, 7vw, 4.25rem)"
    fontWeight: 900
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  figure:
    fontFamily: "Inter, sans-serif"
    fontSize: "2.375rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.035em"
    fontFeature: "\"tnum\""
  headline:
    fontFamily: "Inter, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  figure-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "\"tnum\""
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "\"cv11\", \"ss01\""
  body-strong:
    fontFamily: "Inter, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.3
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
  stamp:
    fontFamily: "Inter, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.04em"
rounded:
  tab: "8px"
  chip: "10px"
  field: "11px"
  btn: "14px"
  btn-lg: "15px"
  bubble: "18px"
  card: "22px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.cognac}"
    textColor: "{colors.cognac-ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.btn}"
    height: "44px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.cognac-bright}"
    textColor: "{colors.cognac-ink}"
  button-primary-lg:
    backgroundColor: "{colors.cognac}"
    textColor: "{colors.cognac-ink}"
    rounded: "{rounded.btn-lg}"
    height: "52px"
    padding: "0 18px"
  button-secondary:
    backgroundColor: "{colors.walnut-raised}"
    textColor: "{colors.linen-ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.btn}"
    height: "44px"
    padding: "0 16px"
  button-ghost:
    textColor: "{colors.taupe-muted}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.btn}"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.walnut-raised}"
    textColor: "{colors.linen-ink}"
  button-danger:
    textColor: "{colors.sold-out-red}"
    rounded: "{rounded.btn}"
    height: "44px"
  input:
    backgroundColor: "{colors.espresso-ground}"
    textColor: "{colors.linen-ink}"
    rounded: "{rounded.field}"
    height: "46px"
    padding: "11px 13px"
  chip:
    backgroundColor: "{colors.walnut-raised}"
    textColor: "{colors.linen-ink}"
    rounded: "{rounded.chip}"
    height: "38px"
    padding: "7px 13px"
  segmented-tab-active:
    backgroundColor: "{colors.cognac}"
    textColor: "{colors.cognac-ink}"
    rounded: "{rounded.tab}"
    height: "32px"
  card:
    backgroundColor: "{colors.walnut-card}"
    textColor: "{colors.linen-ink}"
    rounded: "{rounded.card}"
  outfit-ticket:
    backgroundColor: "{colors.walnut-card}"
    textColor: "{colors.linen-ink}"
    rounded: "{rounded.card}"
    padding: "16px 20px"
  bubble-user:
    backgroundColor: "{colors.walnut-raised}"
    textColor: "{colors.linen-ink}"
    rounded: "{rounded.bubble}"
    padding: "10px 16px"
  stamp-in-stock:
    textColor: "{colors.stock-green}"
    typography: "{typography.stamp}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
---

# Design System: Progetto Stile

## Overview

**Creative North Star: "The Fitting Room After Closing Time"**

The shop is shut, the racks are quiet, and one mirror is still lit. Working screens are the calm part of the room: espresso surfaces, walnut cards stepped up in tone, linen text, and a single cognac accent for the one action that matters. Nothing glows, drifts or shimmers while you are describing what you need, choosing a budget or tidying a wardrobe. This is Palestra's locker-room structure, translated into brown.

The lit moment is the outfit. It arrives as a hang-tag ticket, printed up from behind its tear, with a warm mirror light drifting behind it and the stub floodlit from its corner: Totale, then Budget → Restano. That is Olanda's floodlit ticket, warmed from stadium green to cognac. The ticket is the only surface that carries light, so the light keeps meaning "this is your outfit".

Density is relaxed. A 760px reading column, generous gaps between turns, and one family (Inter) doing all the work through weight: black for the figures that matter, bold for titles, semibold for controls, regular for reading. Dark is the default theme. Light is a sand ground with white cards lifted by a soft shadow. Italian is the default language and English is a switch, so every string must survive the longer of the two.

**Key Characteristics:**
- Dark espresso by default, with a sand-and-white light theme on the same tokens.
- One cognac accent, used for the primary action, focus, selection and what's left of the budget.
- Green, amber and red carry meaning only: in stock or success, over budget, sold out or danger.
- One lit surface: the outfit ticket, with its tear, stub and mirror light.
- Inter only, self-hosted and shared with olanda_project; tabular numerals for every price.
- Palestra's corners: 22px cards, 14px buttons, 11px fields, 10px chips.

## Colors

Warm brown neutrals in two themes, one cognac accent, and three status hues that never decorate.

Every colour is a CSS variable set per theme in `src/index.css` (`:root` is light, `.dark` is dark) and mapped to Tailwind classes. Components never hard-code a theme value.

### Primary
- **Cognac** (dark) / **Cognac Deep** (light): the single accent. Primary buttons, the active look tab, pressed chip borders and tints, the focus ring, the text caret, list markers, links in the stylist's prose, the accent half of the landing headline, and the Restano figure on the ticket stub. Carries Cognac Ink (dark) or white (light) on its fill.
- **Cognac Bright** (dark) / **Cognac Deeper** (light): the hover state of an accent fill, and nothing else.
- **Cognac Ink**: the near-black brown printed on a cognac fill in the dark theme.

### Status
- **Stock Green**: in stock, owned-and-available states, and success confirmations (copied, saved). Never decoration and never the budget.
- **Budget Amber**: the over-budget figure on the stub ("Oltre il budget") and warnings.
- **Sold-out Red**: sold-out stamps, destructive buttons, error states.

### Neutral
- **Espresso Ground** / **Sand Ground**: the page, and the inside of text fields (fields are sunk into the card in the ground colour). The ticket's side notches are cut in this colour.
- **Walnut Card** / **Paper Card**: cards, the ticket, modals, the composer, the history rail on mobile.
- **Walnut Raised** / **Sand Raised**: chips, secondary buttons, user bubbles, segmented-control tracks, hover fills.
- **Linen Ink** / **Roast Ink**: body text and figures.
- **Taupe Muted**: secondary text, field labels, stub labels, inactive tabs.
- **Taupe Faint**: placeholders, the stub's arrow, icons at rest, scrollbars. It meets 4.5:1 on the ground and the card in both themes (light 4.75:1 and 5.48:1, dark 4.91:1 and 4.63:1).
- **Hairlines** are the ink colour at 9% (`--line`) and 17% (`--line-strong`), never a solid grey. In the dark theme cards carry a 9% hairline; in the light theme the hairline is transparent and the card shadow does the work.
- **Product plate**: product photos sit on a sand plate (the Sand Ground value) in both themes, like a paper tag, so cut-out product shots read the same whatever the theme.

### Named Rules
**The One Accent Rule.** Cognac is the only accent. A screen has one filled cognac action; everything else is raised, ghost or chip.

**The Meaning Only Rule.** Green means in stock or success, amber means over budget, red means sold out or danger. What's left of the budget is cognac, not green, because it is the outfit's figure, not a status.

**The Variable Rule.** Colours live as per-theme variables in `index.css` and nowhere else. A new colour is a new variable in both themes.

## Typography

**Display / Body Font:** Inter (self-hosted variable 100–900, latin and latin-ext subsets, with the system UI stack as fallback)

**Character:** one family doing everything through weight, deliberately the same family as olanda_project so the sibling apps share a voice. Black (900) for the landing headline and the ticket total, extrabold (800) for page greetings and secondary figures, bold for titles, semibold for controls and labels, regular for reading. Stylistic sets `cv11` and `ss01` are on globally.

### Hierarchy
- **Display** (900, 42px → 60px → 68px, line-height 0.98, tracking −0.04em, balanced wrap): the landing headline only, with its second line in cognac.
- **Figure** (900, 34px → 38px, line-height 1, tracking −0.035em, tabular): the ticket total. The heaviest thing on any chat screen.
- **Headline** (800, 28px → 32px, line-height 1.1, tracking −0.03em): page greetings such as the empty chat ("Ciao, …").
- **Title** (700, 17px, tracking −0.01em): ticket and panel titles. Profile section titles run at 15px bold.
- **Figure Small** (800, 20px, tabular): Budget and Restano on the stub.
- **Body** (400, 15px, line-height 1.45; 1.55 in the stylist's prose): messages and explanations, capped near 52–54ch in leads.
- **Label** (600, 13px, Taupe Muted): field labels, stub labels, small section headings. Sentence case.
- **Stamp** (700, 11px, uppercase, tracking 0.04em): status stamps on product photos and the IT / EN language codes. The only capitals in the app.
- Text fields are 16px so iOS never zooms. Nothing that carries information is smaller than 11px.

### Named Rules
**The Tabular Rule.** Every price, total, budget and remainder uses tabular numerals (`.tabular`).

**The Sentence Case Rule.** Buttons, chips, labels and headings are sentence case. Capitals belong to stamps and language codes, where they read as a printed tag.

**The Wordmark Rule.** "Progetto" solid and "Stile" in the cognac gradient (800, tracking −0.03em). It is the only gradient text in the app.

## Layout

App screens hang from a sticky translucent top bar, 60px tall, laid out as three columns: menu or back on the left, the wordmark centred, language switch, theme switch and avatar on the right (switches fold away below 640px). Chat adds a 272px history rail from 1024px up; below that it is a 280px drawer. The conversation and the composer share one centred column capped at 760px, with turns 28px apart. The composer floats at the bottom over a fade from the ground colour and respects the safe-area inset.

The landing page is capped at `max-w-6xl` with 16px gutters: a two-column hero from 1024px (headline and actions beside a live ticket demo), stacking on phones. Spacing follows Tailwind's 4px step: 8–12px between controls, 16px inside cards on phones and 20px from 640px, 24px between stub figures. The ticket's pieces run in a 2 / 3 / 4-column grid at phone / 640px / 768px.

Toasts sit bottom-centre, 120px up, above the composer and clear of the sticky bars.

## Elevation & Depth

Depth is tonal in the dark theme and lifted in the light one. Dark cards step up from the ground in tone (ground → card → raised) with a 9% hairline and no card shadow. Light cards are white on sand with a soft two-layer shadow and no border. Anything that floats over the page (the composer, menus, modals, popovers) takes the float shadow in both themes. The top bar is the one frosted surface: the ground at 82% with a 16px blur.

The mirror light is the other half of depth, and it belongs to the outfit ticket alone: two warm orbs (cognac at 22–30%, rust at 16–18%) blurred 40px, drifting on 18s and 22s loops behind the ticket, plus a radial glow lighting the stub from its top-right corner.

### Shadow Vocabulary
- **Card** (`--shadow-card`; light `0 1px 2px rgb(40 25 10 / 0.04), 0 6px 22px rgb(40 25 10 / 0.07)`, dark `none`): cards, the ticket, the active language code.
- **Float** (`--shadow-float`; light `0 10px 30px rgb(40 25 10 / 0.14)`, dark `0 12px 32px rgb(0 0 0 / 0.6)`): the composer, dropdown menus, modals and sheets.

### Named Rules
**The One Lit Surface Rule.** The mirror light (`.ps-glow`, the stub glow) appears only on the outfit ticket and its landing demo. Working surfaces stay unlit so the light keeps meaning "your outfit".

**The Tone Not Shadow Rule.** In the dark theme, separate surfaces by tone and hairline. Card shadows are a light-theme device.

## Shapes

Softly rounded throughout, on Palestra's scale: 22px for cards, the ticket, the composer and modals; 18px for chat bubbles, with the corner nearest the speaker pinched to 6px; 15px for large buttons; 14px for buttons and product photos; 11px for fields, icon buttons and segmented tracks; 10px for chips; 8px for the segments inside a track. Avatars, the send button, status stamps and badges are full circles or pills. On phones, modals dock to the bottom as sheets with square bottom corners.

The ticket owns a silhouette: a 22px perforated tear with a semicircular notch bitten from each side in the ground colour and a 1.5px dashed rule between them, then the stub with its own rounded bottom corners. Borders are 1px hairlines; the dashed tear is the only broken line.

## Components

### Buttons
Calm and solid, one accent per screen.
- **Shape:** 14px corners, 44px tall (38px small at 10px corners, 52px large at 15px corners), semibold, sentence case, a 0.98 press scale.
- **Primary:** the cognac fill with its on-accent ink; hover deepens to Cognac Bright / Cognac Deeper.
- **Secondary:** the raised fill with a hairline that strengthens on hover.
- **Ghost:** muted text, the raised fill on hover. Used for menus, gallery and back links.
- **Danger:** red text on a 15% red tint with a 40% red border.
- **Icon buttons:** 40px squares at 11px corners, muted icon; the send button is a 40px cognac circle that turns raised and faint when there is nothing to send.

### Chips
- **Style:** the raised fill, a 9% hairline, 13.5px semibold, 38px tall, 10px corners, 0.97 press scale.
- **Pressed:** cognac border and a 14% cognac tint, ink text. Used for occasion suggestions, "Perché questo outfit" and Select.

### Status stamps
Olanda's stamp, warmed: an 11px bold uppercase pill on the product photo, a 10% tint and 40% border in its status colour (green in stock, red sold out), or the card at 90% with a cognac border for pieces you own.

### Cards / Containers
- **Corner Style:** 22px.
- **Background:** Walnut Card / Paper Card.
- **Shadow Strategy:** hairline in dark, card shadow in light (see Elevation).
- **Internal Padding:** 16px on phones, 20px from 640px.
- Cards are not nested: rows inside a card are divided by hairlines or gaps.

### Inputs / Fields
- **Style:** sunk into the card: the ground colour inside, a 17% hairline, 11px corners, 46px tall, 16px text, a cognac caret.
- **Hover / Focus:** the border goes Taupe Faint on hover and cognac on focus, with no ring inside the field.
- **Disabled:** muted text, not-allowed cursor.
- **Labels:** 13px semibold muted, 6px above the field.
- Everywhere else, focus is one ring: 2px cognac, offset 2px.

### Navigation
- **Top bar:** sticky, 60px, the ground at 82% with a 16px blur and a hairline below; wordmark centred.
- **Segmented control:** a raised 11px track with 3px padding. Look tabs on the ticket fill the active segment with cognac; the language switch lifts the active code onto the card colour with the card shadow.
- **History rail:** 272px, transparent on desktop, a card-coloured drawer on mobile.

### Chat
- **User bubble:** raised fill, hairline, 18px corners with the top-right pinched to 6px, 15px text. A chosen option is a cognac-bordered bubble on a 12% cognac tint with a check.
- **Stylist reply:** no bubble; the page is the paper. A 12.5px semibold cognac speaker name with a small cognac dot sits above the prose (max 640px), and lists take cognac markers.
- **Composer:** a 22px card that floats with the float shadow, photo and wardrobe buttons on the left, the round send button on the right; the border warms to cognac at 70% while focused.

### The Outfit Ticket (signature)
The shape every outfit takes, in chat and in the landing demo.
- **Head:** "Outfit n di m" at 17px bold with the piece count beneath, the look switcher (segmented, cognac active) and a ghost gallery button.
- **Pieces:** product cards in a grid, each a 4:5 photo on the sand plate at 14px corners, then brand, name and a tabular price.
- **Tear:** the perforated strip with side notches and a dashed rule.
- **Stub:** Totale, Budget → Restano. The total is the Figure style; Budget is a muted Figure Small; the arrow is Taupe Faint; Restano is cognac, or amber and relabelled "Oltre il budget" when the outfit goes over. "Compra tutto" is the stub's single primary button, with "Perché questo outfit" and Select as chips below.
- **Light:** the mirror light drifts behind the whole ticket and the stub is lit from its top-right corner.
- **Arrival:** the ticket prints in (rises 14px out of a 6px blur, 520ms, `cubic-bezier(0.16, 1, 0.3, 1)`). There is no success toast on the reveal; the ticket is the confirmation.

### Motion
State changes run 150ms ease; presses scale to 0.97–0.98 in 50ms; modals and sheets rise 24px in 240ms on the same expo-out curve as the ticket. A theme switch transitions every colour together for 280ms. Reduced motion collapses all animation and transition to 1ms and stops the orbs.

## Do's and Don'ts

### Do:
- **Do** take every colour from the per-theme variables, and add any new colour to both themes.
- **Do** keep one filled cognac action per screen; everything else is raised, ghost or chip.
- **Do** set every price, total and remainder in tabular numerals, with the ticket total at 900.
- **Do** draw every outfit as the Ticket: pieces, tear, stub reading Totale · Budget → Restano.
- **Do** show Restano in cognac, and switch it to amber with "Oltre il budget" when the outfit goes over.
- **Do** keep information text at Taupe Faint or stronger and at 11px or larger, and text fields at 16px.
- **Do** write strings in Italian first and check the English switch fits the same space.
- **Do** give every animation a reduced-motion fallback.

### Don't:
- **Don't** use green, amber or red for anything but in stock or success, over budget, and sold out or danger.
- **Don't** put the mirror light, drifting orbs or a glow on any surface other than the outfit ticket.
- **Don't** set gradient text anywhere but the "Stile" half of the wordmark.
- **Don't** fire a success toast when outfits arrive; toasts are for errors and side effects, bottom-centre above the composer.
- **Don't** add a second typeface. Inter is shared with olanda_project on purpose.
- **Don't** add card shadows in the dark theme; separate by tone and hairline.
- **Don't** nest cards inside cards.
- **Don't** use capitals outside status stamps and language codes.
