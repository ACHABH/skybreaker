#!/bin/bash
# Rebuilds index.html from src/ (needs bash only). Open index.html in Chrome/Edge/Firefox.
cd "$(dirname "$0")"
{ echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'; cat src/head.html; echo '<style>'; cat src/style.css; echo '</style></head><body>'; cat src/body.html; echo '<script src="lib/three.min.js"></script><script>'; for f in src/[1-9][0-9]_*.js; do cat "$f"; echo; done; echo '</script></body></html>'; } > index.html
echo built index.html
