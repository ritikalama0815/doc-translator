# Doctor's translator

A desktop app that reads messy prescriptions, explains them in plain language, checks drug names against **RxNorm / OpenFDA**, chats about general symptoms with safety rails, and rings local reminders.

```
doctor-translation/
  backend/     OCR, LLM structuring, RxNorm, reminders
  frontend/    Electron + React GUI
```

## Run

```bash
npm run install:all
npm run dev
```

That starts the helper API on `http://127.0.0.1:8787` and opens the window.

## Optional keys

Copy `backend/.env.example` to `backend/.env`, or paste keys in **Settings**:

- `GOOGLE_VISION_API_KEY` — much better on handwriting than Tesseract
- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` — structures OCR and writes explanations

Without keys it still runs: Tesseract + a local parser + the public NIH RxNav API.

Prescriptions and reminders stay in `backend/data/` on this computer.
