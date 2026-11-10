import type { Role } from '@reveal/shared';
import type { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        adminId: Types.ObjectId;
        username: string;
        role: Role;
        sessionId: Types.ObjectId;
        csrfHash: string;
      };
    }
  }
}

export {};
