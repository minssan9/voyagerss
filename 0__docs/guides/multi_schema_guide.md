# Multi-Schema Database Setup Guide

This project uses a multi-schema architecture with Prisma to support three distinct database schemas: `workschd`, `investand`, and `aviation`.

## Architecture Overview

Instead of a single `schema.prisma` file, the schemas are split into three separate files located in `backend/prisma/`:

1.  **`workschd.prisma`**: Schema for the scheduler and team management module.
2.  **`investand.prisma`**: Schema for the investment and market data module.
3.  **`aviation.prisma`**: Schema for the aviation bot module.

Each schema is configured to generate a separate Prisma Client in a custom output path within `node_modules`.

## configuration

### Prisma Schema Files

Each `.prisma` file has a custom `generator` block:

```prisma
// workschd.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/@prisma/client-workschd"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL_WORKSCHD")
  relationMode = "prisma"
}
```

### Prisma Configuration (`backend/src/config/prisma.ts`)

We instantiate and export three separate Prisma Client instances:

```typescript
import { PrismaClient as WorkschdClient } from '@prisma/client-workschd';
import { PrismaClient as InvestandClient } from '@prisma/client-investand';
import { PrismaClient as AviationClient } from '@prisma/client-aviation';

export const workschdPrisma = new WorkschdClient();
export const investandPrisma = new InvestandClient();
export const aviationPrisma = new AviationClient();
```

### TypeScript Configuration (`tsconfig.json`)

To ensure TypeScript resolves the custom client paths correctly, we've updated `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@prisma/client-workschd": ["node_modules/@prisma/client-workschd"],
      "@prisma/client-investand": ["node_modules/@prisma/client-investand"],
      "@prisma/client-aviation": ["node_modules/@prisma/client-aviation"]
    }
  }
}
```

## How to Use

### 1. Generating Clients

When you make changes to a schema, you must regenerate the specific client:

```bash
# Generate all
npx prisma generate --schema=prisma/workschd.prisma
npx prisma generate --schema=prisma/investand.prisma
npx prisma generate --schema=prisma/aviation.prisma
```

### 2. Using in Services

Import the specific client from the config file and the types from the generated package:

```typescript
import { workschdPrisma as prisma } from '../../config/prisma';
import { Account } from '@prisma/client-workschd';

export class AccountService {
  async getAccount(id: number): Promise<Account | null> {
    return await prisma.account.findUnique({ where: { accountId: id } });
  }
}
```

## Database Connections

Ensure your `.env` file contains the distinct connection strings:

```env
DATABASE_URL_WORKSCHD="mysql://..."
DATABASE_URL_INVESTAND="mysql://..."
DATABASE_URL_AVIATION="mysql://..."
```
