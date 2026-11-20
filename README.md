# Puddle – frontend (Steps 1-10)

## Setup (once)
```bash
npx create-next-app@latest puddle --ts --app --no-tailwind --eslint --no-src-dir --import-alias "@/*"
cd puddle
npm i framer-motion        # used from Step 3 onwards
```
Then replace/add these files in the project:

- app/layout.tsx
- app/globals.css
- app/page.tsx
- components/Splash.tsx
- components/Splash.module.css

Run `npm run dev` and open http://localhost:3000 (reload the page to replay the splash).

## Steps
1. Setup, tokens, splash (dark fade-in, eyes blink, paint-drip reveal)
2. Home screen (greeting, chips, composer, top bar)
3. Mascot blob (3D look, eyes, blink, "Pull me down")
4. Voice mode (pull-down, "I am listening.", End button, shrink back)
5. Chat screen (user bubble, typing dots, streaming card)
6. Quiet / Loud choice card
7. Booking card (8:00 -> 9:15 roll, Book table, confirmed state)
8. Saturday day sheet (bottom sheet)
9. Composer typing + send + reply ("Got it, I will keep that in mind.")
10. Polish: Inter font, replay (press R), compare guide -> see COMPARE.md and reference/
