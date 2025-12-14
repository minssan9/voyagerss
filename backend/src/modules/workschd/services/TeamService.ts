import { Team } from '@prisma/client-workschd';
import { workschdPrisma as prisma } from '../../config/prisma';

export class TeamService {
    async getTeamById(id: number): Promise<Team | null> {
        // Java 'Long' -> JS 'number' (or BigInt if mapped)
        // Prisma maps BigInt to BigInt. JSON.stringify fails on BigInt.
        // We need to handle BigInt serialization or use Int in schema if possible.
        // INVESTAND schema had BigInt. Workschd schema I used Long -> Int map?
        // In schema.prisma I defined `id Long @id ...`. Prisma maps this to BigInt.
        // I should probably map it to Int if possible, or handle BigInt serialization globally.
        // For now, I'll cast or use a helper.

        // Wait, my schema Step 234: `id Long`. Prisma `Long` isn't a type. `Int` or `BigInt`.
        // I wrote `id Long` in schema? Step 234 shows:
        // model Team { id Long ... } -> Wait, `Long` is not valid Prisma type. It should be `BigInt` or `Int`.
        // I might have a schema error if `npx prisma generate` didn't catch it.
        // Step 216 `format` succeeded? 
        // Let's check `backend/prisma/schema.prisma` again. I might have invalid types.

        // If I used `Long`, Prisma Format should have failed or corrected it.
        // Checking file content from Step 234:
        // model Team { id Long ... }
        // Prisma types: String, Boolean, Int, BigInt, Float, Decimal, DateTime, Json, Bytes.
        // `Long` is NOT a valid type. `npx prisma format` likely failed or I didn't check output.
        // Command Step 219 (generate) and 220 (format) were "background". I didn't check status.
        // They probably failed. I need to fix schema types first.
        return null;
    }
}
