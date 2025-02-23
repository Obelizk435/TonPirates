#!/bin/bash

# Install dependencies
npm install mysql2 @prisma/client

# Generate Prisma client
npx prisma generate

# Push the schema to the database
npx prisma db push

# Initialize the database with test data
npx ts-node scripts/init-db.ts

# Run database tests
npx ts-node scripts/test-db.ts

