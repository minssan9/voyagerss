import { Injectable } from '@nestjs/common';
import { rbacPrisma } from '../config/prisma';
import type { PrismaClient } from '@prisma/client-rbac';

@Injectable()
export class RbacPrismaService {
  readonly role: PrismaClient['role'];
  readonly permission: PrismaClient['permission'];
  readonly rolePermission: PrismaClient['rolePermission'];
  readonly subjectRole: PrismaClient['subjectRole'];

  constructor() {
    this.role = rbacPrisma.role;
    this.permission = rbacPrisma.permission;
    this.rolePermission = rbacPrisma.rolePermission;
    this.subjectRole = rbacPrisma.subjectRole;
  }
}
