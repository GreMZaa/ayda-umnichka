import { HomeworkRepository } from '../repositories/homework.repository';
import { CreateHomeworkDTO, SubmitSolutionDTO } from '../validators/homework.validator';
import { AppError } from '../middleware/apiErrors';

export class HomeworkService {
  static async getHomework(studentPublicId?: string) {
    const { data, error } = await HomeworkRepository.findHomework(studentPublicId);
    if (error) {
      console.error('Error fetching homework from Supabase:', error);
      throw new AppError(error.message, 500);
    }
    return data || [];
  }

  static async submitSolution(dto: SubmitSolutionDTO) {
    const updateData: Record<string, any> = {
      status: 'submitted',
      updated_at: new Date().toISOString(),
    };

    if (dto.student_solution_text !== undefined) {
      updateData.student_solution_text = dto.student_solution_text;
    }
    if (dto.student_solution_file_url !== undefined) {
      updateData.student_solution_file_url = dto.student_solution_file_url;
    }

    const { data, error } = await HomeworkRepository.updateHomework(dto.id, updateData);
    if (error) {
      throw new AppError(error.message, 500);
    }

    return { success: true, homework: data };
  }

  static async createHomework(dto: CreateHomeworkDTO) {
    const newRecord = {
      title: dto.title,
      task_description: dto.task_description,
      student_public_id: dto.student_public_id || null,
      student_name: dto.student_name?.trim() || 'Всем ученикам',
      teacher_name: dto.teacher_name?.trim() || 'Преподаватель',
      task_file_url: dto.task_file_url || null,
      file_name: dto.file_name || null,
      status: 'assigned',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await HomeworkRepository.createHomework(newRecord);
    if (error) {
      console.error('Error inserting homework into Supabase:', error);
      throw new AppError(error.message, 500);
    }

    return { success: true, homework: data };
  }

  static async deleteHomework(id: string) {
    const { error } = await HomeworkRepository.deleteHomework(id);
    if (error) {
      console.error('Error deleting homework:', error);
      throw new AppError(error.message, 500);
    }
    return { success: true };
  }
}
