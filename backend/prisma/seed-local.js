"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLocalEnvironment = isLocalEnvironment;
exports.seedLocalAll = seedLocalAll;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../src/config/prisma");
const bcrypt = __importStar(require("bcrypt"));
function isLocalhostDb(url) {
    if (!url)
        return false;
    const lowerUrl = url.toLowerCase();
    return (lowerUrl.includes('localhost') ||
        lowerUrl.includes('127.0.0.1') ||
        lowerUrl.startsWith('file:') ||
        lowerUrl.includes('sqlite'));
}
function isLocalEnvironment() {
    return (isLocalhostDb(process.env.DATABASE_URL) ||
        isLocalhostDb(process.env.DATABASE_URL_WORKSCHD) ||
        isLocalhostDb(process.env.DATABASE_URL_INVESTAND) ||
        isLocalhostDb(process.env.DATABASE_URL_AIPR) ||
        process.env.NODE_ENV === 'development');
}
function parseSqlFile(filePath) {
    const content = fs_1.default.readFileSync(filePath, 'utf-8');
    // Strip block comments
    let cleanContent = content.replace(/\/\*[\s\S]*?\*\//g, '');
    // Split lines to remove line-by-line comments
    const lines = cleanContent.split('\n');
    const cleanLines = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('--'))
            return '';
        const commentIndex = line.indexOf('-- ');
        if (commentIndex !== -1) {
            return line.slice(0, commentIndex);
        }
        return line;
    });
    cleanContent = cleanLines.join('\n');
    // Split statements by semicolon
    return cleanContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
}
function seedLocalAll() {
    return __awaiter(this, arguments, void 0, function* (force = false) {
        if (!isLocalEnvironment()) {
            console.log('[seed-local] Not running in localhost DB environment. Skipping seeding.');
            return;
        }
        console.log('[seed-local] Localhost DB detected. Initializing seeding...');
        // 1. Seed workschd
        try {
            const workschdCount = yield prisma_1.workschdPrisma.account.count();
            if (workschdCount === 0 || force) {
                console.log('[seed-local] Seeding workschd database with SQL...');
                const statements = parseSqlFile(path_1.default.resolve(__dirname, 'seed-workschd.sql'));
                for (const stmt of statements) {
                    yield prisma_1.workschdPrisma.$executeRawUnsafe(stmt);
                }
                console.log('[seed-local] workschd database seeded.');
                // Seed system config
                console.log('[seed-local] Seeding workschd system configs...');
                const { seedConfig } = yield Promise.resolve().then(() => __importStar(require('../src/config/seed-config')));
                yield seedConfig(force);
            }
            else {
                console.log('[seed-local] workschd database already contains data. Skipping.');
            }
        }
        catch (err) {
            console.error('[seed-local] Error seeding workschd database:', err);
        }
        // 2. Seed investand
        try {
            const investandCount = yield prisma_1.investandPrisma.adminUser.count();
            if (investandCount === 0 || force) {
                console.log('[seed-local] Seeding investand database with SQL...');
                const statements = parseSqlFile(path_1.default.resolve(__dirname, 'seed-investand.sql'));
                for (const stmt of statements) {
                    yield prisma_1.investandPrisma.$executeRawUnsafe(stmt);
                }
                console.log('[seed-local] investand database seeded.');
            }
            else {
                console.log('[seed-local] investand database already contains data. Skipping.');
            }
        }
        catch (err) {
            console.error('[seed-local] Error seeding investand database:', err);
        }
        // 3. Seed aipr
        try {
            const aiprCount = yield prisma_1.aiprPrisma.admin.count();
            if (aiprCount === 0 || force) {
                console.log('[seed-local] Seeding aipr database...');
                const passwordHash = yield bcrypt.hash('admin1234!', 12);
                yield prisma_1.aiprPrisma.admin.upsert({
                    where: { email: 'admin@example.com' },
                    update: {},
                    create: {
                        email: 'admin@example.com',
                        role: 'SUPER',
                        passwordHash,
                    },
                });
                console.log('[seed-local] aipr database seeded.');
            }
            else {
                console.log('[seed-local] aipr database already contains data. Skipping.');
            }
        }
        catch (err) {
            console.error('[seed-local] Error seeding aipr database:', err);
        }
    });
}
if (require.main === module) {
    const force = process.argv.includes('--force');
    seedLocalAll(force)
        .then(() => {
        console.log('[seed-local] Seeding execution finished.');
        process.exit(0);
    })
        .catch(err => {
        console.error('[seed-local] Seeding execution failed:', err);
        process.exit(1);
    });
}
