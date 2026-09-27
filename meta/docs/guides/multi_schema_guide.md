# Multi-Schema Database Setup Guide

This project uses a multi-schema architecture with Prisma. Each active module has its own schema file and generated Prisma client.

## Architecture Overview

Schemas are split into separate files in `backend/prisma/`:

1.  **`workschd.prisma`**: Scheduler and team management module.
2.  **`aviation.prisma`**: Aviation bot module.
3.  **`aipr.prisma`**: AIPR module.
4.  **`rbac.prisma`**: Role-based access control.

Each schema generates a separate Prisma Client in a custom output path within `node_modules`.

The legacy Investand module has been removed. Historical tables are dropped idempotently at boot via `backend/prisma/sql/drop-investand-tables.sql`.

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

We instantiate and export separate Prisma Client instances:

```typescript
import { PrismaClient as WorkschdClient } from '@prisma/client-workschd';
import { PrismaClient as AviationClient } from '@prisma/client-aviation';
import { PrismaClient as AiprClient } from '@prisma/client-aipr';
import { PrismaClient as RbacClient } from '@prisma/client-rbac';

export const workschdPrisma = new WorkschdClient();
export const aviationPrisma = new AviationClient();
export const aiprPrisma = new AiprClient();
export const rbacPrisma = new RbacClient();
```

## How to Use

### 1. Generating Clients

When you make changes to a schema, regenerate the specific client:

```bash
# Generate all active clients
npx prisma generate --schema=prisma/workschd.prisma
npx prisma generate --schema=prisma/aviation.prisma
npx prisma generate --schema=prisma/aipr.prisma
npx prisma generate --schema=prisma/rbac.prisma
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

Ensure your `.env` file contains the connection strings required by the active schemas. See [setup.md](../setup.md) for the current boot env vs DB config split.
