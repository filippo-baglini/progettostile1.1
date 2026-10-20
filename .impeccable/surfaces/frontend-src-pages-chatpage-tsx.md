---
version: 1
slug: "frontend-src-pages-chatpage-tsx"
primary_target: "frontend/src/pages/ChatPage.tsx"
related_targets: ["frontend/src/pages/LandingPage.tsx","frontend/src/pages/ProfilePage.tsx"]
---

# Surface brief: Progetto Stile app (whole frontend redesign)

Scope: every route. Chat (/chat) and Profile (/profile) are Operate; Landing (/) is Persuade; How to use is Read; auth pages are Operate.
Audience and job: see PRODUCT.md. Constraints pinned by the user: brown / light-brown palette, dark default with a light theme too, Italian default with an English switch, placeholder logo (favicon.svg), same family vibe as progetto-palestra and olanda_project (Palestra's calm structure, Olanda's glow kept for the outfit reveal).

## Direction contract

THESIS: The fitting room after closing time. Calm, airy working screens (Palestra's locker room), and one lit moment: the outfit arrives as a hang-tag ticket under a warm mirror light (Olanda's floodlit ticket, warmed). It refuses the category default of a cream-and-serif fashion boutique and the generic chatbot of grey bubbles.

OWN-WORLD: Espresso near-black ground (#0c0907), walnut cards (#16110d / #211a14), a single cognac/caramel accent (#d39a62 on dark, #8a5523 on light) with dark ink on it, linen text (#f4ede5) and taupe muted text. Light theme: sand ground (#f3eee8), white cards, cognac accent. One family (Inter, self-hosted like Olanda) at 800–900 for titles and figures, tabular numerals for every price. Palestra corners: 22px cards, 14px buttons, 11px fields, 10px chips. Wordmark "Progetto" solid + "Stile" in a cognac gradient, the only gradient text. Green, amber and red mean only in stock, over budget, and out of stock/danger.

STORY: Visitors understand that you describe a need, the stylist asks back (budget, occasion), and up to three whole outfits come back within budget or from their own wardrobe. They believe it because the outfit ticket shows the pieces, the total and what's left of the budget. They start chatting, then save their wardrobe.

FIRST VIEWPORT: Chat. A sticky translucent header across the top: menu/logo on the left, the "Progetto Stile" wordmark centred, language switch, theme switch and avatar on the right. A history rail of 272px on desktop (a drawer on mobile). The centre is a 760px column; when empty it shows a greeting at 30px/800 and three occasion chips. The composer floats near the bottom as a 22px-radius pill-card with photo, wardrobe and send buttons. Landing: the wordmark headline, a one-line promise, and a live outfit ticket demo beside it, with "Inizia a chattare" as the primary action.

FORM: pinned by the user (sibling family, not rolled): Palestra structure + Olanda ticket and glow, translated to brown. Signature: the outfit ticket — piece row, a perforated tear with side notches, and a stub "Totale €x · budget → restano €y" floodlit from a warm orb, total at 900 weight, tabular. Seed key: none (user-pinned direction, concept-seed skipped by rule).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
