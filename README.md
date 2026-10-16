# SKYBREAK

3D destruction-racing game. Break your floating island down to 0% integrity before your rivals do.

## Play
Open `index.html` in any modern browser — desktop, tablet or phone (Chrome, Edge, Firefox, Safari). No server or install needed.
On a phone, open it in landscape; tap the fullscreen button for more room. Serving over http(s) (or a host such as itch.io) is best for fullscreen on mobile.
Everything runs offline except the two Google Fonts (Bungee, Chakra Petch), which fall back to system fonts if offline.

## Controls — keyboard & mouse
WASD move · Space jump · Shift dash · E grapple · Left click use tool · 1-0 / wheel / Tab select
F5 switch first/third-person view · T climb back up from the meme floor · Q Secret Power (some: hold Q + right click) · 1-6 claim item drops · R rebuild (Free Break) · Esc pause

## Controls — touch (phones & tablets, shown automatically)
Left side: floating joystick to move · drag anywhere on the right to look · FIRE (hold to use the tool; drag while holding to aim) · JUMP · DASH · HOOK · SECRET (appears when you own a power) · CLIMB (on the meme floor) · tap hotbar slots to switch tools · top-right buttons: pause, POV, fullscreen.
Settings has Graphics (Performance/Quality) and Touch Controls (Auto / Always on / Off).

## Controls — gamepad (Xbox/PlayStation/standard layout; plug in or pair, then press any button)
Left stick move · right stick look · RT fire · A jump · B dash · X grapple · Y secret power · LB/RB previous/next slot · LT or D-pad up climb · Select/View switch POV · Start pause.
Menus: stick or D-pad to move, A to select, B to go back. Item draft: A/B/X/Y or D-pad up/down to pick.

## Rare drops (item drops in Multiplayer, Solo, Campaign and Endless)
Each item drop has a 1% chance to include the **Nuke Bomb** (☢ — arm it, 2 seconds later the whole island is wiped out: instant win; rivals can grab it too in a race draft) and a 5% chance to include the **Kamehameha** (🔵 — hold fire to charge, release for a huge energy beam; second strongest weapon). Free Break gives you both to play with. Rates live in `RARE` at the top of `src/65_epic.js`.

## Modes
Multiplayer match (you vs 5 AI bots, offline), Solo Break, Campaign (6 chapters + 3 bosses), 7 Challenges, Endless, Free Break.

## Source
`src/` holds the modules in load order (10_core, 20_island, 22_gen, 30_player, 40_items, 50_bots, 60_modes, 62_floor, 65_epic, 70_ui, 72_input, 99_main), plus `style.css`.
After editing run `./build.sh` to regenerate `index.html`. three.js r128 is bundled in `lib/` (MIT license).
Progress is stored in your browser's localStorage.
