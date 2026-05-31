# ResumeOptimize

ResumeOptimize is an MVP for AI-assisted resume optimization and interview practice.

The app lives in `resume-mvp` and includes:

- Resume PDF/TXT upload or pasted text
- Job description text or screenshot upload
- DeepSeek-powered STAR resume optimization
- Interview question generation
- Text or browser speech input for answers
- Follow-up questions and interview summary

## Deploy

This project needs a Node server so the DeepSeek API key stays private. GitHub Pages is not suitable for the DeepSeek-enabled version.

Recommended deployment: Render.

1. Connect this repository to Render.
2. Use the included `render.yaml` blueprint.
3. Set environment variable `DEEPSEEK_API_KEY`.
4. Deploy.

Local development:

```bash
cd resume-mvp
cp .env.example .env
npm start
```
