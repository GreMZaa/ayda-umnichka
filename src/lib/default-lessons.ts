import { TEACHER_VASILINA_AVATAR, SHARONOV_AVATAR } from "@/lib/default-avatar";
import { getTolyattiTodayDateStr } from "@/lib/tolyatti-time";

export const getSharonovActiveLesson = () => {
  const todayStr = getTolyattiTodayDateStr(); // YYYY-MM-DD в часовом поясе Тольятти
  return {
    id: "d97d6358-c75f-48af-afaa-8a905f77bc1e",
    title: "Английский язык: Индивидуальное занятие",
    subjectId: "dc85f0c2-0b64-41aa-80c1-436af66ddaab",
    subjectName: "Английский язык",
    subjectColor: "#059669",
    teacherId: "882042e2-d020-426c-9826-9fba5b23ad2e",
    teacherName: "Шаронова Василина Владимировна",
    teacherAvatar: TEACHER_VASILINA_AVATAR,
    studentId: "53df3c76-9d23-49aa-ba0c-6f40d7a56657",
    studentName: "Сергей Дмитриевич",
    studentAvatar: SHARONOV_AVATAR,
    startTime: `${todayStr}T11:43:16.607Z`,
    endTime: `${todayStr}T19:59:00.000Z`,
    status: "SCHEDULED",
    roomName: "room-5w79zg",
    notes: [],
  };
};

export const DEFAULT_STUDENT_LESSONS: any[] = [
  getSharonovActiveLesson(),
];
