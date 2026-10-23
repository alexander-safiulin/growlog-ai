# Интерактивные макеты (localhost)

Запуск: `pnpm dev`, затем открыть в браузере (только `localhost`). Рамка **390×844**, нижняя панель с safe area на всех экранах.

| Экран | URL |
|-------|-----|
| Главная | `/preview/mockups/dashboard?lang=ru&appearance=light` |
| Журнал | `/preview/mockups/journal?lang=ru&appearance=light` |
| Список циклов | `/preview/mockups/cycles-list?lang=ru&appearance=light` |
| Цикл, обзор | `/preview/mockups/cycle-detail?lang=ru&appearance=light` |
| Цикл, хронология | `/preview/mockups/cycle-detail?lang=ru&appearance=light&section=chronology` |
| Лист «Запись» | `/preview/mockups/capture-sheet?lang=ru&appearance=light` |
| VPD, виджет (проба) | `/preview/mockups/vpd-expanded?lang=ru&appearance=light` |
| VPD, выбор датчика | `/preview/mockups/vpd-sensor-picker?lang=ru&appearance=light` |

Для тёмной темы замените `appearance=light` на `appearance=dark`.

Исходники: `components/design-mockups/*.tsx`. PNG: `docs/design/artifacts/mockups/`.

```bash
bash scripts/capture-app-redesign-artifacts.sh
```
