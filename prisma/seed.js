const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database for «АйДаУмничка»...');

  // Очистка
  await prisma.lessonNote.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.parentStudent.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.user.deleteMany();

  // Создаем предметы
  const math = await prisma.subject.create({
    data: { name: 'Математика и логика', color: '#2563eb' }
  });
  const reading = await prisma.subject.create({
    data: { name: 'Русский язык и каллиграфия', color: '#d946ef' }
  });
  const english = await prisma.subject.create({
    data: { name: 'Английский язык', color: '#059669' }
  });
  const preschool = await prisma.subject.create({
    data: { name: 'Подготовка к школе', color: '#d97706' }
  });

  // Создаем пользователей
  // 1. Преподаватель
  const teacher = await prisma.user.create({
    data: {
      email: 'teacher@umnichka.ru',
      name: 'Анна Сергеевна Иванова',
      phone: '+7 (999) 111-22-33',
      role: 'TEACHER',
      bio: 'Преподаватель высшей категории, стаж 12 лет. Математика и развитие логического мышления.',
      avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&h=200&fit=crop&crop=faces'
    }
  });

  // 2. Ученик 1
  const student1 = await prisma.user.create({
    data: {
      email: 'misha@umnichka.ru',
      name: 'Миша Смирнов',
      phone: '+7 (999) 333-44-55',
      role: 'STUDENT',
      bio: '3 класс, увлекается конструированием и шахматами',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces'
    }
  });

  // 3. Ученик 2
  const student2 = await prisma.user.create({
    data: {
      email: 'alisa@umnichka.ru',
      name: 'Алиса Смирнова',
      phone: '+7 (999) 333-44-56',
      role: 'STUDENT',
      bio: '5 класс, любит чтение и английский',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces'
    }
  });

  // 4. Родитель
  const parent = await prisma.user.create({
    data: {
      email: 'parent@umnichka.ru',
      name: 'Елена Смирнова',
      phone: '+7 (999) 555-66-77',
      role: 'PARENT',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces'
    }
  });

  // 5. Администратор центра
  const admin = await prisma.user.create({
    data: {
      email: 'admin@umnichka.ru',
      name: 'Ольга Николаевна (Руководитель центра)',
      phone: '+7 (999) 777-88-99',
      role: 'ADMIN',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=faces'
    }
  });

  // Связываем родителя с детьми
  await prisma.parentStudent.create({
    data: { parentId: parent.id, studentId: student1.id }
  });
  await prisma.parentStudent.create({
    data: { parentId: parent.id, studentId: student2.id }
  });

  // Создаем уроки
  const now = new Date();
  
  // Урок 1: Прямо сейчас (активный для тестирования видеосвязи)
  const lessonLive = await prisma.lesson.create({
    data: {
      title: 'Математика: Решение олимпиадных задач и логика',
      subjectId: math.id,
      teacherId: teacher.id,
      studentId: student1.id,
      startTime: new Date(now.getTime() - 10 * 60 * 1000), // начался 10 минут назад
      endTime: new Date(now.getTime() + 40 * 60 * 1000),   // еще 40 минут
      status: 'LIVE',
      roomName: 'umnichka-math-live-' + Math.random().toString(36).substring(2, 8)
    }
  });

  // Урок 2: Предстоящий через 2 дня
  const lessonUpcoming = await prisma.lesson.create({
    data: {
      title: 'Английский: Разговорный клуб и времена глаголов',
      subjectId: english.id,
      teacherId: teacher.id,
      studentId: student2.id,
      startTime: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 49 * 60 * 60 * 1000),
      status: 'SCHEDULED',
      roomName: 'umnichka-eng-' + Math.random().toString(36).substring(2, 8)
    }
  });

  // Урок 3: Завершенный с отзывом преподавателя для родителя
  const lessonCompleted = await prisma.lesson.create({
    data: {
      title: 'Математика: Дроби и текстовые задачи',
      subjectId: math.id,
      teacherId: teacher.id,
      studentId: student1.id,
      startTime: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() - 47 * 60 * 60 * 1000),
      status: 'COMPLETED',
      roomName: 'umnichka-math-past-1'
    }
  });

  // Заметка к завершенному уроку
  await prisma.lessonNote.create({
    data: {
      lessonId: lessonCompleted.id,
      authorId: teacher.id,
      content: 'Отлично разобрали тему сложения дробей с разными знаменателями.',
      grade: 5,
      feedback: 'Миша проявил большую инициативу, быстро схватывает логику. Домашнее задание на закрепление выполнил на отлично.'
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
