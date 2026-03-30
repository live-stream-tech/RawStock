#!/bin/bash
# Deploy script - ensures full rebuild and deployment

set -e

echo "🏗️  Building frontend and backend..."
npm run build:prod

echo "✅ Build complete. Checking dist/"
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
  echo "❌ ERROR: dist/ directory is empty. Build failed."
  exit 1
fi

echo "📤 Pushing to GitHub..."
git add -A
if ! git diff-index --quiet HEAD; then
  git commit -m "Deploy: $(date +%Y-%m-%d\ %H:%M:%S)"
fi
git push

echo "✅ GitHub push complete"
echo ""
echo "⚠️  IMPORTANT: Click 'Publish' in Replit UI to deploy to production"
echo "   - This triggers the build command in .replit"
echo "   - Which calls 'npm run build:prod' (frontend + backend)"
echo ""
