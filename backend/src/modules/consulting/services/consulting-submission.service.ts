import { HttpStatus, Injectable } from '@nestjs/common';
import axios from 'axios';
import path from 'path';
import { workschdPrisma as prisma } from '../../../config/prisma';
import { configService } from '../../../config/config-service';
import { I18nHttpException } from '../../common/i18n-http.exception';

export type SubmissionType = 'COMPANY' | 'SYSTEM';
export const SUBMISSION_TYPES: SubmissionType[] = ['COMPANY', 'SYSTEM'];
export const SUBMISSION_STATUSES = ['RECEIVED', 'REVIEWING', 'DONE'];

/** 업로드 제한 — 프론트(ConsultingDocuments.vue)와 동일하게 유지 */
export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
// nginx client_max_body_size 20m 이내 (multipart 오버헤드 고려)
export const MAX_TOTAL_BYTES = 18 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.ppt', '.pptx', '.hwp', '.hwpx',
  '.txt', '.md', '.json', '.yaml', '.yml', '.sql', '.png', '.jpg', '.jpeg', '.zip',
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX_PER_IP = 5;

export interface SubmissionFileInput {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface CreateSubmissionInput {
  type?: string;
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  message?: string;
  locale?: string;
  consent?: string | boolean;
  /** honeypot — 사람이 채우지 않는 숨김 필드 */
  website?: string;
}

/** multipart 파일명은 latin1 로 들어오므로 UTF-8 로 복원 (한글/일본어 파일명) */
export function decodeFileName(name: string): string {
  try {
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    return decoded.includes('�') ? name : decoded;
  } catch {
    return name;
  }
}

function clean(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

@Injectable()
export class ConsultingSubmissionService {
  private readonly hits = new Map<string, number[]>();

  /** 같은 IP 에서 1시간 5회 초과 제출 차단 (공개 업로드 남용 방지) */
  private checkRate(ip: string): void {
    const now = Date.now();
    const recent = (this.hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length >= RATE_MAX_PER_IP) {
      throw new I18nHttpException('consulting.submission.tooMany', HttpStatus.TOO_MANY_REQUESTS);
    }
    recent.push(now);
    this.hits.set(ip, recent);
  }

  validate(input: CreateSubmissionInput, files: SubmissionFileInput[]) {
    const type = clean(input.type, 20).toUpperCase() as SubmissionType;
    if (!SUBMISSION_TYPES.includes(type)) {
      throw new I18nHttpException('consulting.submission.invalidType', HttpStatus.BAD_REQUEST);
    }
    const companyName = clean(input.companyName, 200);
    const contactName = clean(input.contactName, 100);
    const email = clean(input.email, 255);
    if (!companyName || !contactName) {
      throw new I18nHttpException('consulting.submission.required', HttpStatus.BAD_REQUEST);
    }
    if (!EMAIL_PATTERN.test(email)) {
      throw new I18nHttpException('consulting.submission.invalidEmail', HttpStatus.BAD_REQUEST);
    }
    if (!(input.consent === true || input.consent === 'true')) {
      throw new I18nHttpException('consulting.submission.consent', HttpStatus.BAD_REQUEST);
    }
    if (files.length === 0) {
      throw new I18nHttpException('consulting.submission.noFiles', HttpStatus.BAD_REQUEST);
    }
    if (files.length > MAX_FILES) {
      throw new I18nHttpException('consulting.submission.tooManyFiles', HttpStatus.BAD_REQUEST, { max: MAX_FILES });
    }
    let total = 0;
    for (const f of files) {
      const ext = path.extname(decodeFileName(f.originalname)).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw new I18nHttpException('consulting.submission.fileType', HttpStatus.BAD_REQUEST, { ext: ext || '-' });
      }
      if (f.size > MAX_FILE_BYTES) {
        throw new I18nHttpException('consulting.submission.fileSize', HttpStatus.BAD_REQUEST, { mb: MAX_FILE_BYTES / 1024 / 1024 });
      }
      total += f.size;
    }
    if (total > MAX_TOTAL_BYTES) {
      throw new I18nHttpException('consulting.submission.totalSize', HttpStatus.BAD_REQUEST, { mb: MAX_TOTAL_BYTES / 1024 / 1024 });
    }
    return {
      type,
      companyName,
      contactName,
      email,
      phone: clean(input.phone, 50) || null,
      message: clean(input.message, 5000) || null,
      locale: clean(input.locale, 10) || null,
    };
  }

  async create(input: CreateSubmissionInput, files: SubmissionFileInput[], ip: string) {
    // honeypot 이 채워져 있으면 봇 — 저장하지 않고 성공처럼 응답
    if (clean(input.website, 200)) return { id: 0, fileCount: 0 };

    const data = this.validate(input, files);
    this.checkRate(ip || 'unknown');

    const submission = await prisma.consultingSubmission.create({
      data: {
        ...data,
        ipAddress: ip?.slice(0, 64) || null,
        files: {
          create: files.map((f) => ({
            fileName: decodeFileName(f.originalname).slice(0, 255),
            fileMime: (f.mimetype || 'application/octet-stream').slice(0, 150),
            fileSize: f.size,
            fileData: f.buffer,
          })),
        },
      },
      select: { id: true, type: true, companyName: true, contactName: true, email: true },
    });

    void this.notifySlack(submission.id, data.type, data.companyName, data.contactName, data.email, files.length);
    return { id: submission.id, fileCount: files.length };
  }

  private async notifySlack(id: number, type: string, company: string, contact: string, email: string, count: number) {
    const url = configService.get('SLACK_WEBHOOK_URL');
    if (!url) return;
    try {
      const label = type === 'COMPANY' ? '기업 분석' : '시스템 분석';
      await axios.post(url, {
        text: `📎 컨설팅 문서 제출 #${id} (${label})\n• ${company} / ${contact} <${email}>\n• 첨부 ${count}개`,
      }, { timeout: 5000 });
    } catch (err) {
      console.warn('[consulting] slack notify failed', (err as Error).message);
    }
  }

  async findAll(params: { status?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const where = params.status ? { status: params.status } : {};
    const [items, total] = await Promise.all([
      prisma.consultingSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { files: { select: { id: true, fileName: true, fileMime: true, fileSize: true } } },
      }),
      prisma.consultingSubmission.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async updateStatus(id: number, status: string) {
    if (!SUBMISSION_STATUSES.includes(status)) {
      throw new I18nHttpException('consulting.submission.invalidStatus', HttpStatus.BAD_REQUEST, { status });
    }
    return prisma.consultingSubmission.update({ where: { id }, data: { status }, select: { id: true, status: true } });
  }

  async getFile(fileId: number) {
    const file = await prisma.consultingSubmissionFile.findUnique({ where: { id: fileId } });
    if (!file) throw new I18nHttpException('consulting.submission.fileNotFound', HttpStatus.NOT_FOUND);
    return file;
  }
}
