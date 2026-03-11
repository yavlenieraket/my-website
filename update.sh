#!/bin/bash
cd /Users/ekaterina.iakovleva/Documents/New\ project
git add .
git commit -m "update $(date '+%Y-%m-%d %H:%M')"
git push
echo "✅ Site updated! Changes will be live in ~1 minute."
