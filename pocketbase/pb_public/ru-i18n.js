// PocketBase Admin UI - Полный русский перевод (интерфейс и терминология)
(function () {
  const dictionary = {
    // Навигация и меню
    "Collections": "Коллекции",
    "New collection": "Новая коллекция",
    "Superusers": "Суперпользователи",
    "Logs": "Журнал логов",
    "Settings": "Настройки",
    "Application": "Приложение",
    "Mail settings": "Настройки почты",
    "Files storage": "Файловое хранилище",
    "Storage": "Хранилище",
    "Token options": "Параметры токенов",
    "Backups": "Резервные копии",
    "Crons": "Запланированные задачи",
    "Export collections": "Экспорт коллекций",
    "Import collections": "Импорт коллекций",
    "Sync": "Синхронизация",

    // Основные действия
    "New record": "Создать запись",
    "Save changes": "Сохранить изменения",
    "Save": "Сохранить",
    "Cancel": "Отмена",
    "Delete": "Удалить",
    "Confirm": "Подтвердить",
    "Close": "Закрыть",
    "Edit": "Редактировать",
    "Duplicate": "Дублировать",
    "Filter": "Фильтр",
    "Sort": "Сортировка",
    "Search": "Поиск",
    "Clear": "Очистить",
    "Reset": "Сбросить",
    "Refresh": "Обновить",
    "Copy ID": "Скопировать ID",
    "Copy": "Копировать",
    "Export": "Экспорт",
    "Import": "Импорт",
    "Download": "Скачать",
    "Upload": "Загрузить",
    "Log out": "Выйти",
    "Sign in": "Войти",
    "Preview": "Предпросмотр",
    "Toggle columns": "Колонки",
    "Create": "Создать",
    "Columns": "Колонки",

    // Конструктор коллекций и схемы
    "Fields": "Поля",
    "API Rules": "Правила API",
    "Indexes": "Индексы",
    "Field name": "Имя поля",
    "Field type": "Тип поля",
    "Plain text": "Обычный текст",
    "Number": "Число",
    "Bool": "Логический (Bool)",
    "Email": "Эл. почта",
    "URL": "Ссылка (URL)",
    "Date": "Дата и время",
    "Select": "Выбор (Select)",
    "File": "Файл",
    "Relation": "Связь (Relation)",
    "JSON": "JSON",
    "Editor": "HTML редактор",
    "Autodate": "Авто-дата",
    "Required": "Обязательное",
    "Nonempty": "Не пустое",
    "Unique": "Уникальное",
    "Presentable": "Отображаемое",
    "System": "Системное",
    "Auth": "Авторизация",
    "View": "Представление",
    "Base": "Базовая",
    "Add field": "Добавить поле",
    "New field": "Новое поле",
    "Collection name": "Имя коллекции",
    "Collection type": "Тип коллекции",

    // Таблицы и списки записей
    "No records found.": "Записей не найдено.",
    "No records found": "Записей не найдено",
    "No collections found.": "Коллекций не найдено.",
    "No collections found": "Коллекций не найдено",
    "No logs found.": "Логов не найдено.",
    "No logs found": "Логов не найдено",
    "Search records...": "Поиск записей...",
    "Search collections...": "Поиск коллекций...",
    "Search logs...": "Поиск по логам...",
    "Created": "Создано",
    "Updated": "Обновлено",
    "ID": "ID",
    "Type": "Тип",
    "User": "Пользователь",
    "Status": "Статус",
    "Action": "Действие",
    "Details": "Подробности",

    // Первоначальная настройка и авторизация
    "Create first superuser": "Создание первого администратора",
    "Create your first superuser account to get started:": "Создайте первого суперпользователя для начала работы:",
    "Password": "Пароль",
    "Password confirm": "Подтверждение пароля",
    "Confirm password": "Подтвердите пароль",
    "Sign in to your account": "Вход в панель управления",
    "Invalid login credentials.": "Неверный логин или пароль.",

    // Уведомления и подтверждения
    "Successfully saved.": "Успешно сохранено.",
    "Successfully created.": "Успешно создано.",
    "Successfully deleted.": "Успешно удалено.",
    "Successfully updated.": "Успешно обновлено.",
    "Are you sure you want to delete": "Вы уверены, что хотите удалить",
    "This action cannot be undone.": "Это действие нельзя отменить.",
    "Changes saved": "Изменения сохранены",
    "Loading...": "Загрузка..."
  };

  function translateText(text) {
    if (!text) return text;
    const trimmed = text.trim();
    if (dictionary[trimmed]) {
      return text.replace(trimmed, dictionary[trimmed]);
    }
    // Проверка совпадения без знаков препинания
    for (const [en, ru] of Object.entries(dictionary)) {
      if (trimmed === en) {
        return text.replace(trimmed, ru);
      }
    }
    return text;
  }

  function translateNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const val = node.nodeValue;
      if (val && val.trim().length > 0) {
        const tr = translateText(val);
        if (tr !== val) {
          node.nodeValue = tr;
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Атрибуты placeholder, title, aria-label
      if (node.hasAttribute("placeholder")) {
        const ph = node.getAttribute("placeholder");
        const tr = translateText(ph);
        if (tr !== ph) node.setAttribute("placeholder", tr);
      }
      if (node.hasAttribute("title")) {
        const tt = node.getAttribute("title");
        const tr = translateText(tt);
        if (tr !== tt) node.setAttribute("title", tr);
      }
      if (node.hasAttribute("aria-label")) {
        const al = node.getAttribute("aria-label");
        const tr = translateText(al);
        if (tr !== al) node.setAttribute("aria-label", tr);
      }

      // Не транслируем скрипты, стили и поля ввода кода/JSON
      if (node.tagName === "SCRIPT" || node.tagName === "STYLE" || node.tagName === "CODE" || node.classList?.contains("prism")) {
        return;
      }

      for (let child = node.firstChild; child; child = child.nextSibling) {
        translateNode(child);
      }
    }
  }

  // Запуск наблюдателя за изменениями DOM
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          translateNode(node);
        }
      } else if (mutation.type === "characterData") {
        const val = mutation.target.nodeValue;
        const tr = translateText(val);
        if (tr !== val) {
          mutation.target.nodeValue = tr;
        }
      }
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    document.title = "PocketBase — Панель управления";
    translateNode(document.body);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });

  // Периодический проход для динамических всплывающих окон Svelte
  setInterval(() => {
    if (document.body) {
      translateNode(document.body);
    }
  }, 400);
})();
