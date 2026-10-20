# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two needs, weighted equally:

- **Shoppers with an occasion.** People who need an outfit for something specific (a wedding, an interview, a date) at a stated budget, and don't want to scroll endless shop feeds.
- **Wardrobe owners.** People who want to get more out of the clothes they already have: they upload their pieces and ask for outfits built from them, or around one of them.

Most people will do both: shop for one occasion, style from their own wardrobe for another.

## Product Purpose

Progetto Stile is a conversational stylist. You describe what you need in plain language or upload a photo. It asks follow-up questions like a stylist would (budget, occasion), then replies with up to three complete outfits. Each outfit is put together from real shop listings or from the user's own digital wardrobe. Success means the user leaves with a look they would actually wear, and doesn't have to assemble it themselves.

## Positioning

The difference is the combination, with no single lead:

1. **Complete outfits on a budget.** Whole looks, top to shoes, chosen as a set to fit within the stated budget. Not a list of single items.
2. **Conversation, not filters.** Text or a photo goes in, and the stylist asks back before it builds anything.
3. **Your own wardrobe.** It can style you entirely from clothes you already own, which a shop's search cannot do.

## Operating Context

- Chat is the core workflow: a message or photo, any follow-up questions, then up to three outfits. You can refine an outfit ("change the shoes", "remove the jacket"), ask for an explanation ("explain this outfit"), and keep a conversation history (rename or delete chats).
- Photo input: find a piece like the one in the photo, copy a whole look, or complete an outfit around a piece you own.
- Profile page: the digital wardrobe sorted into sections (upload pieces, pick pieces to build around, the **Only my clothes** toggle with no budget), plus preferences (favourite colour, brand, material, gender), username and avatar.
- Accounts: email/password with email confirmation and password reset, or Google sign-in. Guests can also chat.
- Building an outfit can take a while (several model calls). Progress is reported while the questions are over and the outfit is being put together, so waiting is part of the experience.

## Capabilities and Constraints

- Stack in place: React 19, TypeScript, Vite, Tailwind, framer-motion and lucide-react in `frontend/`, with a Flask API behind it.
- **Name: Progetto Stile.** It replaces "StyleFinder AI" everywhere in the UI.
- **Languages: Italian by default, with an English switch.** The UI is currently English-only, so i18n support has to be added.
- **Light and dark themes** are both required (a theme toggle exists today).
- The catalogue comes from eBay listings (`backend/import_ebay.py`). It starts empty, but **Only my clothes** works without it.
- Pages: Landing, Login, Sign up, Reset password, Chat, Profile (wardrobe and preferences), How to use.

## Brand Commitments

- Name: **Progetto Stile**.
- Palette: the app theme stays **brownish / light brown**. This is a binding constraint from the user.
- Logo: use the existing mark (`frontend/public/favicon.svg`) wherever a logo is needed. It is a **placeholder and will be replaced**, so nothing should depend on its shape or colours.

## Evidence on Hand

- No testimonials, user counts, press or partner brands exist. Do not invent any.
- The current landing page's "Curated from World-Class Brands" strip (Nike, Zara, H&M, Mango, Adidas logos in `frontend/public/assets/landing/`) overstates a catalogue made of eBay listings. **Remove it** and don't reintroduce brand-partner claims.
- Real material that is available: the actual chat flow, outfit cards built from listings, and wardrobe photos the user uploads.

## Product Principles

1. **Whole looks over single items.** Show results as a complete outfit first, with the individual pieces second.
2. **Ask before guessing.** A clarifying question is part of the service, not friction.
3. **The user's own clothes are first-class.** Treat the wardrobe as just as important as the shop.
4. **Honest about the source.** Listings are real shop items. Don't claim brand partnerships or curation that doesn't exist.
5. **Waiting should feel accompanied.** Generation is slow, so progress and state must always be visible.
