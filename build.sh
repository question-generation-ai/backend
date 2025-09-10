#!/bin/bash

# Build script for production
npm run build

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy
