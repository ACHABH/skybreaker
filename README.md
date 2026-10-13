# SKYBREAK

3D destruction-racing game. Break your floating island down to 0% integrity before your rivals do.

## Play
Open `index.html` in a desktop browser (Chrome, Edge or Firefox). No server or install needed.
Everything runs offline except the two Google Fonts (Bungee, Chakra Petch), which fall back to system fonts if offline.

## Controls
WASD move · Space jump · Shift dash · E grapple · Left click use tool · 1-0 / wheel / Tab select
Q Secret Power (some: hold Q + right click) · 1-6 claim item drops · R rebuild (Free Break) · Esc pause

## Modes
Multiplayer match (you vs 5 AI bots, offline), Solo Break, Campaign (6 chapters + 3 bosses), 7 Challenges, Endless, Free Break.

## Source
`src/` holds the modules in load order (10_core, 20_island, 22_gen, 30_player, 40_items, 50_bots, 60_modes, 70_ui, 99_main), plus `style.css`.
After editing run `./build.sh` to regenerate `index.html`. three.js r128 is bundled in `lib/` (MIT license).
Progress is stored in your browser's localStorage.
