# Quick Setup Instructions

## Your Gemini API Configuration

I've received your credentials. Here's how to set them up:

### Step 1: Create/Edit `.env` file

In the directory: `C:\Users\sumit\Sumit-Personal\ERP\Question generator\TOOL\backend`

Create a file named `.env` (if it doesn't exist) and add:

```env
# Your Gemini Configuration
GEMINI_API_KEY=AIzaSyAQ.Ab8RN6KRTuGzu-OkrW-9fr2SlqQd3wpwXsvWu3tG0AKrHsBPbQ
GEMINI_MODEL=gemini-2.5-flash
GOOGLE_CLOUD_PROJECT=project-b8658063-ae09-4686-b81

# AI Image Generation
AI_IMAGE_ENABLED=true

# Database (keep your existing value)
DATABASE_URL="postgresql://..."

# Server
PORT=5000
NODE_ENV=development
```

### Step 2: Restart the Backend

```bash
# Stop the current backend (Ctrl+C)
# Then restart:
npm start
```

### Step 3: Test AI Image Generation

```bash
# Check health endpoint
curl http://localhost:5000/api/images/health
```

You should see:
```json
{
  "status": "healthy",
  "checks": {
    "aiProviders": {
      "gemini": true
    }
  }
}
```

### Step 4: Generate Questions with Images

Use the frontend question generator with `enableVisuals: true`. The system will now:
1. Try templates first (free)
2. If no template matches, use Gemini AI (generates simple teaching illustrations)
3. If Gemini fails, use SVG fallback

## Important Notes

⚠️ **Security**: The `.env` file is already in `.gitignore`, so your API key won't be committed to Git.

💰 **Cost**: Gemini Imagen costs ~$0.01 per image. With templates covering 80% of cases, expect ~$2 per 1000 questions.

📊 **Monitoring**: Check logs for:
- `[INFO] Attempting AI image generation`
- `[INFO] Image generated successfully with Gemini Imagen`

## Troubleshooting

If AI generation doesn't work:
1. Verify API key is correct
2. Check Google Cloud Console that Vertex AI is enabled
3. Ensure project ID matches your GCP project
4. Check backend logs for errors
