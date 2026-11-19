import { ConsultingSubmissionService, decodeFileName, MAX_FILES } from './consulting-submission.service';

jest.mock('../../../config/prisma', () => ({ workschdPrisma: {} }));
jest.mock('../../../config/config-service', () => ({ configService: { get: () => undefined } }));

const file = (name: string, size = 10) => ({ originalname: name, mimetype: 'application/pdf', size, buffer: Buffer.alloc(size) });
const base = { type: 'company', companyName: 'Acme', contactName: 'Kim', email: 'kim@acme.com', consent: 'true' };

describe('ConsultingSubmissionService.validate', () => {
  const svc = new ConsultingSubmissionService();

  it('accepts a valid company submission and normalizes type', () => {
    const data = svc.validate(base, [file('report.pdf')]);
    expect(data.type).toBe('COMPANY');
    expect(data.phone).toBeNull();
  });

  it.each([
    [{ ...base, type: 'other' }, [file('a.pdf')]],
    [{ ...base, email: 'nope' }, [file('a.pdf')]],
    [{ ...base, consent: 'false' }, [file('a.pdf')]],
    [{ ...base, companyName: ' ' }, [file('a.pdf')]],
    [base, []],
    [base, [file('run.exe')]],
    [base, [file('big.pdf', 11 * 1024 * 1024)]],
    [base, Array.from({ length: MAX_FILES + 1 }, (_, i) => file(`f${i}.pdf`))],
  ])('rejects invalid input #%#', (input, files) => {
    expect(() => svc.validate(input, files)).toThrow();
  });

  it('restores UTF-8 file names sent as latin1', () => {
    const latin1 = Buffer.from('회사소개서.pdf', 'utf8').toString('latin1');
    expect(decodeFileName(latin1)).toBe('회사소개서.pdf');
    expect(decodeFileName('plain.pdf')).toBe('plain.pdf');
  });

  it('silently drops honeypot submissions', async () => {
    await expect(svc.create({ ...base, website: 'spam' }, [file('a.pdf')], '1.1.1.1')).resolves.toEqual({ id: 0, fileCount: 0 });
  });
});
