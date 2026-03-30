#!/bin/bash
rm -rf dist server_dist
npm install && npm run server:build && EXPO_PUBLIC_DOMAIN=figma-importer.replit.app npx expo export --platform web
