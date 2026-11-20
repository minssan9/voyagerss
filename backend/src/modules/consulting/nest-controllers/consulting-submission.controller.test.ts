import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ConsultingModule } from '../consulting.module';

const create = jest.fn();
jest.mock('../../../config/prisma', () => ({
  workschdPrisma: { consultingSubmission: { create: (...args: unknown[]) => create(...args) } },
}));
jest.mock('../../../config/config-service', () => ({ configService: { get: () => undefined } }));

describe('POST /consulting/submissions (multipart)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [ConsultingModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(() => app.close());
  beforeEach(() => create.mockReset().mockResolvedValue({ id: 7 }));

  it('stores fields and files with a UTF-8 file name', async () => {
    const res = await request(app.getHttpServer())
      .post('/consulting/submissions')
      .field('type', 'SYSTEM').field('companyName', 'Acme').field('contactName', 'Kim')
      .field('email', 'kim@acme.com').field('consent', 'true').field('website', '')
      .attach('files', Buffer.from('%PDF-1.4'), { filename: '시스템구성도.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 7, fileCount: 1 });
    const data = create.mock.calls[0][0].data;
    expect(data.type).toBe('SYSTEM');
    expect(data.files.create[0].fileName).toBe('시스템구성도.pdf');
    expect(data.files.create[0].fileData.toString()).toBe('%PDF-1.4');
  });

  it('rejects a disallowed file type without saving', async () => {
    const res = await request(app.getHttpServer())
      .post('/consulting/submissions')
      .field('type', 'COMPANY').field('companyName', 'Acme').field('contactName', 'Kim')
      .field('email', 'kim@acme.com').field('consent', 'true')
      .attach('files', Buffer.from('MZ'), { filename: 'run.exe' });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

});
