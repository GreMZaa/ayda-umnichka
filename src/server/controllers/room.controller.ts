import { NextRequest } from 'next/server';
import { RoomService } from '../services/room.service';
import { apiSuccess, apiError } from '../middleware/apiErrors';

export class RoomController {
  static async getMessages(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const roomToken = searchParams.get('roomToken')?.trim();

      if (!roomToken) {
        return apiError('roomToken required', 400);
      }

      const result = await RoomService.getRoomMessages(roomToken);
      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('RoomController.getMessages error:', err);
      return apiError(err.message, err.statusCode || 500, { messages: [] });
    }
  }

  static async addMessage(req: NextRequest) {
    try {
      const body = await req.json();
      const { roomToken, message } = body;
      const result = await RoomService.addRoomMessage(roomToken, message);
      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('RoomController.addMessage error:', err);
      return apiError(err.message, err.statusCode || 500);
    }
  }

  static async uploadFile(req: NextRequest) {
    try {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return apiError('Файл не найден', 400);
      }

      const result = await RoomService.uploadRoomFile(file);
      return apiSuccess(result, 200);
    } catch (err: any) {
      console.error('RoomController.uploadFile error:', err);
      return apiError(err.message || 'Ошибка загрузки файла', err.statusCode || 500);
    }
  }
}
