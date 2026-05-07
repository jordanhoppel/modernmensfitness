#!/bin/bash
# Usage: ./add-page.sh filename.html
# Converts HTML file to proper Astro page and pushes

FILE=$1
BASENAME=$(basename "$FILE" .html)
DEST=~/Downloads/modernmensfitness/src/pages/$BASENAME.astro

echo '---
---' | cat - "$FILE" > "$DEST"

cd ~/Downloads/modernmensfitness
git add .
git commit -m "add page: $BASENAME"
git push

echo "Done. Check: modernmensfitness.com/$BASENAME/"
