import request from 'supertest';
import express from 'express';
import workschdRoutes from '../routes';
import { workschdPrisma as prisma } from '../../../config/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock Prisma
jest.mock('../../../config/prisma', () => ({
    workschdPrisma: {
        account: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        accountRole: {
            create: jest.fn(),
        },
        team: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
        },
        teamMember: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
        },
        task: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        taskEmployee: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        $transaction: jest.fn((cb) => cb({
            task: { create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data.data })) }
        })),
    },
}));

// Setup Test App
const app = express();
app.use(express.json());
app.use('/api/workschd', workschdRoutes);

// Error middleware for tests
app.use((err: any, req: any, res: any, next: any) => {
    console.error('TEST APP ERROR:', err);
    res.status(500).json({ message: err.message });
});

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

describe('Workschd API Integration Tests', () => {
    const mockUser = {
        accountId: 1,
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashed_password',
        status: 'ACTIVE',
        accountRoles: [{ roleType: 'ROLE_USER' }],
    };

    const mockToken = jwt.sign(
        { accountId: 1, email: 'test@example.com', roles: ['ROLE_USER'] },
        SECRET_KEY,
        { expiresIn: '1h' }
    );

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Auth Routes', () => {
        test('POST /api/workschd/auth/login - Success', async () => {
            (prisma.account.findFirst as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as any) = jest.fn().mockResolvedValue(true);

            const response = await request(app)
                .post('/api/workschd/auth/login')
                .send({ email: 'test@example.com', password: 'password123' })
                .expect(200);

            expect(response.header).toHaveProperty('authorization');
            expect(response.body).toBeDefined(); // Returns accessToken
        });

        test('POST /api/workschd/auth/login - Invalid Credentials', async () => {
            (prisma.account.findFirst as jest.Mock).mockResolvedValue(null);

            await request(app)
                .post('/api/workschd/auth/login')
                .send({ email: 'wrong@example.com', password: 'password123' })
                .expect(401);
        });

        test('POST /api/workschd/auth/signup - Success', async () => {
            (prisma.account.count as jest.Mock).mockResolvedValue(0);
            (prisma.account.create as jest.Mock).mockResolvedValue(mockUser);

            const response = await request(app)
                .post('/api/workschd/auth/signup')
                .send({
                    email: 'new@example.com',
                    username: 'newuser',
                    password: 'password123'
                })
                .expect(200);

            expect(response.body).toHaveProperty('email', 'test@example.com');
        });
    });

    describe('Account Routes', () => {
        test('GET /api/workschd/accounts/:id - Success with Auth', async () => {
            (prisma.account.findUnique as jest.Mock).mockResolvedValue(mockUser);

            const response = await request(app)
                .get('/api/workschd/accounts/1')
                .set('Authorization', `Bearer ${mockToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('accountId', 1);
        });

        test('GET /api/workschd/accounts/:id - 401 Unauthorized without Token', async () => {
            await request(app)
                .get('/api/workschd/accounts/1')
                .expect(401);
        });

        test('PUT /api/workschd/accounts/profile - Success', async () => {
            (prisma.account.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (prisma.account.update as jest.Mock).mockResolvedValue({
                ...mockUser,
                username: 'updated-name'
            });

            const response = await request(app)
                .put('/api/workschd/accounts/profile')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({ name: 'updated-name' })
                .expect(200);

            expect(response.body).toHaveProperty('username', 'updated-name');
        });

        test('POST /api/workschd/accounts/change-password - Success', async () => {
            (prisma.account.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as any) = jest.fn().mockResolvedValue(true);
            (bcrypt.hash as any) = jest.fn().mockResolvedValue('new_hashed_password');
            (prisma.account.update as jest.Mock).mockResolvedValue({});

            const response = await request(app)
                .post('/api/workschd/accounts/change-password')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({ oldPassword: 'password123', newPassword: 'new-password' })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
        });
    });

    describe('Team Routes', () => {
        test('GET /api/workschd/teams/:id - Success', async () => {
            const mockTeam = { id: 1, name: 'Test Team', region: 'Seoul' };
            (prisma.team.findUnique as any) = jest.fn().mockResolvedValue(mockTeam);

            const response = await request(app)
                .get('/api/workschd/teams/1')
                .set('Authorization', `Bearer ${mockToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('name', 'Test Team');
        });

        test('GET /api/workschd/teams/:id - 404 Not Found', async () => {
            (prisma.team.findUnique as any) = jest.fn().mockResolvedValue(null);

            await request(app)
                .get('/api/workschd/teams/999')
                .set('Authorization', `Bearer ${mockToken}`)
                .expect(404);
        });
    });

    describe('Task Routes', () => {
        const mockTask = {
            id: 1,
            title: 'Test Task',
            workerCount: 5,
            currentWorkerCount: 0,
            status: 'OPEN',
            teamId: 1,
            shopId: 1,
            createdBy: 1,
        };

        const adminToken = jwt.sign(
            { accountId: 1, email: 'admin@example.com', roles: ['ADMIN', 'TEAM_LEADER'] },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        test('POST /api/workschd/task - Success (Team Leader)', async () => {
            (prisma.account.findUnique as jest.Mock).mockResolvedValue({
                ...mockUser,
                accountRoles: [{ roleType: 'ADMIN' }, { roleType: 'TEAM_LEADER' }]
            });
            (prisma.$transaction as any) = jest.fn().mockImplementation(async (cb) => cb(prisma));
            (prisma.task.create as jest.Mock).mockResolvedValue(mockTask);

            const response = await request(app)
                .post('/api/workschd/task')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'Test Task', workerCount: 5, teamId: 1, shopId: 1, startDateTime: new Date(), endDateTime: new Date() })
                .expect(201);

            expect(response.body).toHaveProperty('title', 'Test Task');
        });

        test('POST /api/workschd/task - 403 Forbidden (Regular User)', async () => {
            (prisma.account.findUnique as jest.Mock).mockResolvedValue(mockUser);

            await request(app)
                .post('/api/workschd/task')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({ title: 'Forbidden Task' })
                .expect(403);
        });

        test('GET /api/workschd/task - List Tasks', async () => {
            (prisma.task.findMany as any) = jest.fn().mockResolvedValue([mockTask]);
            (prisma.task.count as jest.Mock).mockResolvedValue(1);

            const response = await request(app)
                .get('/api/workschd/task')
                .set('Authorization', `Bearer ${mockToken}`)
                .expect(200);

            expect(response.body.content).toHaveLength(1);
            expect(response.body.totalElements).toBe(1);
        });

        test('GET /api/workschd/task/:id - Success', async () => {
            (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);

            const response = await request(app)
                .get('/api/workschd/task/1')
                .set('Authorization', `Bearer ${mockToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('id', 1);
        });
    });
});
