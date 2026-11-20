# Puddle – compare against the recording (Step 10)

Press **R** anywhere (not inside the text box) to replay from the splash.
Reference contact sheets are in `reference/` (open next to the running app).
Video timeline (seconds in Screen_Recording_2026-11-19_185220.mp4):

| t (s)      | What happens                                          | Reference sheet            |
|------------|-------------------------------------------------------|----------------------------|
| ~3.2 - 6.4 | splash fade-in, 2 blinks, drip reveal, home appears   | 04_splash_to_home          |
| ~6.6 - 8.2 | drag mascot down -> voice mode                        | 05_pull_down_to_voice      |
| ~8.2 - 9.6 | "I am listening.", End -> mascot shrinks to top       | 05 / 06                    |
| ~9.6 - 12  | Plan dinner -> bubble, mascot flight, dots, card      | 06_chat_start              |
| ~12 - 13.5 | Quiet / Loud, "Quiet" bubble                          | 06 / 07                    |
| ~13.6 - 16 | booking card, Book table, 8:00 -> 9:15, confirmed     | 07_booking_and_sheet       |
| ~16 - 19.5 | View booking -> Saturday sheet, drag down, close      | 07_booking_and_sheet       |
| ~19.8 - 24 | typing, send, reply, compose button -> back to home   | 08_typing_send_reply_loop  |

## Where each knob lives (tweak, reload, compare)

| Looks wrong                    | File / value                                                    |
|--------------------------------|-----------------------------------------------------------------|
| splash colour / hold / blinks  | components/Splash.module.css  (`--indigo` in globals.css, delays 0.9s / 1.9s / 2.5s) |
| drip shape and lengths         | components/Splash.tsx `DRIPS` ([left %, height px]) + `.edge`   |
| greeting / chips position      | components/Home.module.css `.center` (padding-top 172px)        |
| composer size                  | components/Composer.module.css `.card`, `.input`                |
| blob shape / wobble / eyes     | components/Mascot.module.css `@keyframes morph`, `.eyes`        |
| pull-down distance             | components/Home.tsx `* 0.26` (fraction of screen height)        |
| blob size in voice mode        | components/Home.tsx `<Mascot size={170}>`                       |
| voice text / End button spots  | components/Home.module.css `.listening` (top 47%), `.end`       |
| mascot flight curve            | components/Home.module.css `.home` transition (--cx / --cy easings) |
| mascot rest spot in chat       | components/Home.module.css `.mascotPos` (152px, 42px)           |
| chat timings                   | components/Home.tsx `startDinner` / `choose` / `send` (ms values) |
| word-by-word stream speed      | components/Chat.tsx `i * 110` ms                                |
| card text size / width         | components/Chat.module.css `.q` (21px, 13.2em)                  |
| digit roll speed               | components/BookingCard.module.css `.strip` (0.75s) + delays in BookingCard.tsx |
| sheet height / position        | components/DaySheet.module.css `.sheet` (top 31%, bottom 5%)    |

When you spot a difference, tell me: "<screen> - <what is different>" and I will fix it.
