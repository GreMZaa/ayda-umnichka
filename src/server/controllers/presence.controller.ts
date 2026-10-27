import { NextRequest } from 'next/server';
import { PresenceService } from '../services/presence.service';
import { apiSuccess, apiError } from '../middleware/apiErrors';

export class PresenceController {
  static async updatePresence(req: NextRequest) {
    try {
      let body: any = {};
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        body = await req.json();
      } else {
        const text = await req.text();
        try {
          body = JSON.parse(text);
        } catch {
          body = {};
        }
      }

      const { publicId, status = 'online' } = body;
      if (!publicId) {
        return apiError('publicId is required', 400);
      }

      const result = await PresenceService.updatePresence(publicId, status);
      if (result.notFound) {
        return apiSuccess(result, 404);
      }

      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('PresenceController.updatePresence error:', err);
      return apiError(err.message || 'Server error', err.statusCode || 500);
    }
  }

  static async getPresence(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const publicId = searchParams.get('id') || searchParams.get('userId');

      if (!publicId) {
        return apiError('id is required', 400);
      }

      const result = await PresenceService.getPresence(publicId);
      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('PresenceController.getPresence error:', err);
      return apiError(err.message || 'Server error', err.statusCode || 500);
    }
  }
}
