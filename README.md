# JolBilet — ПДД Казахстана: бесплатный тренажёр билетов, знаков и ситуаций

**Бесплатный тренажёр для подготовки к теоретическому экзамену по ПДД Казахстана.**

## Что внутри

- **Экзамен 20×20** — как на настоящем экзамене: 20 вопросов, 20 минут, не более 2 ошибок
- **8 режимов тренировки** — экзамен, свободный режим, блиц, слабые места, билет дня, по темам, только знаки, только ситуации
- **65 дорожных знаков** — оригинальные SVG-иллюстрации, описания на 3 языках, связи с вопросами
- **9 видов разметки** — визуальные схемы горизонтальной разметки
- **10 диаграмм ситуаций** — перекрёстки, круговое движение, пешеходные переходы, выезд со двора
- **45+ вопросов** — с объяснениями, ссылками на пункты ПДД и картинками знаков
- **Справочник ПДД** — 15 глав, 26 ключевых пунктов с краткими изложениями
- **18 штрафов** — ориентировочные размеры в МРП (требуют сверки)
- **Прогресс** — XP, серии, календарь активности, умные повторы слабых мест
- **Закладки и заметки** — сохраняйте важные вопросы и конспектируйте
- **3 языка** — русский, қазақша, English
- **Офлайн-режим** — PWA, работает без интернета
- **Тёмная и светлая темы** — дизайн в стиле glass/accent

## Стек

### Фронтенд
- **React 19** + **TypeScript** — строгая типизация
- **Vite 6** — быстрая сборка
- **Tailwind CSS v4** — утилитарные стили
- **React Router 7** — маршрутизация
- **zustand** — управление состоянием
- **Dexie** (IndexedDB) — локальное хранение прогресса
- **i18next** — интернационализация
- **lucide-react** — иконки
- **vite-plugin-pwa** — офлайн-режим

### Бэкенд / инструменты
- **Rust 2021** — общая логика, CLI, валидация контента
  - `pdd-core` — модели данных, валидация вопросов, дедупликация
  - `pdd-srs` — алгоритм spaced repetition (SM-2)
  - `pdd-cli` — CLI для валидации контента, сборки билетов, статистики

### Сборка
- **npm workspaces** — монорепо
- **JSON Schema** — валидация контента (Zod на клиенте, serde в Rust)

## Быстрый старт

```bash
# 1. Установить зависимости
npm install

# 2. Собрать контент (знаки, вопросы, билеты)
node tools/build-content.mjs
node tools/signs/generate.mjs

# 3. Запустить dev-сервер
npm run dev

# 4. Открыть http://localhost:5173
```

## Команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Dev-сервер Vite (порт 5173) |
| `npm run build` | Production-сборка в `apps/web/dist` |
| `npm run typecheck` | TypeScript без emit |
| `npm run test` | Unit-тесты (Vitest) |
| `npm run content:build` | Валидация контента, сборка JSON-бандла |
| `npm run signs:build` | Генерация SVG-знаков |
| `npm run rust:test` | Cargo test для всех crates |
| `npm run rust:check` | Clippy с `-D warnings` |

## Деплой на Vercel

1. Импортировать репозиторий в Vercel
2. Framework: **Vite**
3. Build Command: `npm run build`
4. Output Directory: `apps/web/dist`
5. Добавить переменные окружения (если нужно)
6. Deploy

`vercel.json` уже настроен для SPA-роутинга и кеширования статики.

## Структура проекта

```
pdd-kz/
├── content/                 # Исходный контент (JSON)
│   ├── questions/           # Вопросы по файлам (01-basics, 02-rules, 03-signs, 04-situations)
│   ├── signs.json           # Метаданные дорожных знаков
│   ├── markings.json        # Метаданные разметки
│   ├── pdd/                 # Справочник ПДД по главам
│   ├── fines.json           # Штрафы
│   ├── topics.json          # Темы для тренировки
│   └── exam-profiles.json   # Профили экзамена (kz_b, kz_b_training)
│
├── tools/
│   ├── build-content.mjs    # Валидатор + сборщик контента
│   └── signs/
│       └── generate.mjs     # Генератор SVG-знаков
│
├── apps/web/
│   ├── src/
│   │   ├── components/      # UI-компоненты (exam, diagram, signs, layout)
│   │   ├── lib/             # Утилиты (content, srs, selection, scoring, storage, search)
│   │   ├── pages/           # Страницы (Home, Exam, Tickets, Topics, Signs, Markings, Reference, Fines, Progress, Favorites, Search)
│   │   ├── store/           # Zustand-стор (useExamSession)
│   │   ├── app/             # Провайдеры (ContentProvider, useTheme, useLocale)
│   │   ├── styles/          # Глобальные CSS-токены и компоненты
│   │   └── main.tsx         # Точка входа
│   ├── public/              # Статика (favicon, иконки)
│   ├── index.html
│   ├── vite.config.ts       # Vite + PWA
│   ├── vitest.config.ts
│   └── package.json
│
├── crates/
│   ├── pdd-core/            # Модели данных, валидация
│   ├── pdd-srs/             # Spaced repetition
│   └── pdd-cli/             # CLI (validate, stats, tickets)
│
├── tests/                   # E2E-тесты (Playwright) — TODO
├── .github/workflows/ci.yml # CI: lint + test + build
├── vercel.json              # Конфиг Vercel
├── Cargo.toml               # Rust workspace
└── package.json             # npm workspaces
```

## Контент и данные

### Добавление вопросов

1. Откройте `content/questions/*.json`
2. Добавьте вопрос по схеме:
```json
{
  "id": "q_new_01",
  "category": "B",
  "topicIds": ["common"],
  "text": { "ru": "...", "kk": "...", "en": "..." },
  "options": [
    { "id": "a", "text": { "ru": "...", "kk": "...", "en": "..." } },
    { "id": "b", "text": { "ru": "...", "kk": "...", "en": "..." } }
  ],
  "correctOptionId": "a",
  "explanation": { "ru": "...", "kk": "...", "en": "..." },
  "pdDRefs": [{ "chapter": "1", "point": "1.2" }],
  "signIds": ["s_1.22"],
  "difficulty": 1,
  "tags": [],
  "source": "author"
}
```
3. Запустите `npm run content:build` — валидатор проверит структуру

### Добавление дорожных знаков

1. Откройте `content/signs.json`
2. Добавьте метаданные знака (code, group, title, desc на 3 языках)
3. Создайте SVG-файл в `content/signs/` или используйте существующий генератор

## Тесты

```bash
# TypeScript unit-тесты
npm run test

# Rust unit-тесты
cargo test --workspace

# Clippy
cargo clippy --workspace --all-targets -- -D warnings

# E2E (TODO)
npm run test:e2e
```

## Лицензия

MIT — см. [LICENSE](LICENSE)

## Статус проекта

- ✅ MVP готов: все основные функции работают
- ✅ 45+ вопросов, 65 знаков, 9 разметок, 10 диаграмм
- ✅ Экзамен, тренировка, билеты, темы, слабые места, билет дня
- ✅ Справочник ПДД, штрафы, избранное, заметки
- ✅ Прогресс, XP, серии, офлайн-режим
- ✅ PWA, тёмная/светлая темы
- ✅ Rust CLI для валидации контента
- ✅ CI настроен
- ✅ Деплой на Vercel настроен

### TODO

- [ ] E2E-тесты (Playwright)
- [ ] Импорт/экспорт прогресса в UI (бэкенд готов)
- [ ] Админ-панель для управления контентом
- [ ] Уведомления о новых версиях контента
- [ ] Категории прав A, C, D (сейчас только B)
- [ ] Локализация уведомлений и ошибок
- [ ] Добавить больше вопросов (цель: 200+)
- [ ] Добавить больше знаков (цель: все 100+)
- [ ] Rust WASM для локальной аналитики

---

**JolBilet** — сделано для практики и портфолио.