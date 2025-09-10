#!/bin/bash

# Install dependencies
npm ci

# Build TypeScript
npm run build

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy
