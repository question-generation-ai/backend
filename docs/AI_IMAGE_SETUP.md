# AI Image Generation Setup Guide

## Overview
The Question Generator now supports AI-powered image generation using **Google Gemini Imagen** as an intelligent fallback when templates don't match. This provides **simple, clear teaching illustrations** instead of generic SVG placeholders.

## ⚠️ Important: Simple Teaching Illustrations Only
The system is configured to generate **SIMPLE, CLEAR educational diagrams** - NOT fancy artwork:
- Black and white line drawings
- Clean, minimal design
- Clear labels and annotations
- Textbook-quality illustrations
- NO artistic effects, shadows, or decorative elements

## Supported AI Providers

### 1. Google Gemini Imagen - **Recommended**
**Best for**: Educational diagrams, simple illustrations
**Quality**: Excellent for teaching materials
**Cost**: ~$0.01 per image
**Style**: Clean, simple, educational

#### Setup:
1. Enable Vertex AI Imagen in Google Cloud Console
2. Get API credentials
3. Add to `.env`:
   ```env
   GEMINI_API_KEY=your-api-key-here
   GOOGLE_CLOUD_PROJECT=your-project-id
   ```

#### Pricing:
- 512x512: $0.008 per image
- 1024x1024: $0.012 per image

### 2. Stable Diffusion (Stability AI) - **Fallback**
**Best for**: Line art, technical diagrams
**Quality**: Good for simple illustrations
**Cost**: ~$0.01 per image

#### Setup:
1. Get API key from [Stability AI](https://platform.stability.ai/)
2. Add to `.env`:
   ```env
   STABILITY_API_KEY=sk-xxxxxxxxxxxxx
   ```

#### Pricing:
- 512x512: $0.008 per image
- 1024x1024: $0.012 per image

## Fallback Hierarchy (New)

```
1. Template Generation (Free, Fast)
   ├─ Perfect match: Subject + Keywords
   └─ Relaxed match: Subject only
   
2. AI Image Generation ($0.01, Moderate Speed)
   ├─ Gemini Imagen (if GEMINI_API_KEY set) ← PREFERRED
   └─ Stable Diffusion (if STABILITY_API_KEY set)
   
3. SVG Mock (Free, Instant)
   └─ Guaranteed fallback
```

## Prompt Engineering for Simple Illustrations

The system automatically adds strict instructions to ensure simple, educational output:

### Base Instructions (Always Added)
```
IMPORTANT: Create a SIMPLE, CLEAR teaching illustration
Style: Clean line drawing or basic diagram
NO artistic effects, NO fancy backgrounds, NO decorative elements
Use: Black lines on white background
Purpose: Educational textbook illustration for students
```

### Negative Prompts (What to Avoid)
The system automatically excludes:
- Artistic effects
- Fancy decorative elements
- Colorful backgrounds
- Complex details
- Photorealistic rendering
- 3D effects
- Shadows and gradients

### Example Generated Prompts

**Mathematics Question**: "Plot the function y = 2x + 3"
```
IMPORTANT: Create a SIMPLE, CLEAR teaching illustration.
Style: Clean line drawing or basic diagram.
NO artistic effects, NO fancy backgrounds, NO decorative elements.
Use: Black lines on white background.
Purpose: Educational textbook illustration for students.

Subject: mathematics
Content: Plot the function y = 2x + 3
Style: Simple mathematical diagram with clear axes, labels, and grid lines. Use basic geometric shapes.

Requirements:
- Black and white or minimal color
- Clear, readable labels
- Simple, clean lines
- No shadows or gradients
- No artistic interpretation
- Textbook-quality diagram
```

**Physics Question**: "Draw a simple circuit"
```
IMPORTANT: Create a SIMPLE, CLEAR teaching illustration.
...
Subject: physics
Content: Draw a simple circuit with battery and resistor
Style: Clear physics diagram showing forces, circuits, or phenomena. Use arrows, labels, and simple shapes.
...
```

## Configuration

### Environment Variables
Add to `Question generator/TOOL/backend/.env`:

```env
# AI Image Generation (Optional)
OPENAI_API_KEY=sk-proj-your-key-here
STABILITY_API_KEY=sk-your-key-here

# Cost Control (Optional)
MAX_AI_IMAGES_PER_DAY=100
AI_IMAGE_ENABLED=true
```

### Enable/Disable AI Generation
In `imageGeneration.service.ts`, AI generation is automatically enabled if API keys are present. To disable:

```typescript
// Set environment variable
AI_IMAGE_ENABLED=false
```

## Testing

### Test AI Generation
```bash
# Set API key
export OPENAI_API_KEY=sk-proj-xxxxx

# Generate question with images
POST /api/v1/questions/generate
{
  "subject": "Physics",
  "chapter": "Electricity",
  "difficulty": "medium",
  "type": "multiple-choice",
  "count": 3,
  "enableVisuals": true
}
```

### Check Logs
Look for these messages:
```
[INFO] Image generation attempt 1/4
[INFO] Image generation attempt 2/4
[INFO] Attempting AI image generation
[INFO] Image generated successfully via AI
```

## Cost Management

### Estimated Costs
**With Templates Only** (Current):
- Cost per question: $0.00
- 1000 questions: $0.00

**With AI Fallback** (New):
- Template success rate: ~80% → $0.00
- AI fallback rate: ~20% → $0.02 per image
- **1000 questions: ~$4.00**

### Cost Control Strategies

1. **Use Templates First** (Already Implemented)
   - AI only triggers if templates fail
   - Saves 80% of costs

2. **Cache AI Images** (Recommended)
   ```typescript
   // Check if similar question already generated
   const cached = await findCachedAIImage(questionHash);
   if (cached) return cached;
   ```

3. **Daily Limits** (Optional)
   ```typescript
   const dailyCount = await getAIImageCountToday();
   if (dailyCount >= MAX_AI_IMAGES_PER_DAY) {
     return null; // Skip AI, use SVG
   }
   ```

4. **Subject-Specific AI** (Advanced)
   ```typescript
   // Only use AI for subjects that benefit most
   const aiEnabledSubjects = ['physics', 'chemistry', 'biology'];
   if (!aiEnabledSubjects.includes(subject)) {
     return null;
   }
   ```

## Prompt Engineering

### Current Prompts
The system automatically builds optimized prompts:

**Mathematics**:
```
Create a clear, simple mathematical diagram with clear labels and axes for: 
"Plot the function y = 2x + 3". 
Style: clean educational illustration, suitable for students, white background, high contrast.
```

**Physics**:
```
Create a clear, simple physics diagram showing the concept clearly for: 
"Draw a circuit with battery and resistor". 
Style: clean educational illustration, suitable for students, white background, high contrast.
```

### Customizing Prompts
Edit `buildAIPrompt()` in `imageGeneration.service.ts`:

```typescript
private static buildAIPrompt(request: ImageGenerationRequest): string {
  // Add more context
  const enhancedPrompt = `
    Educational diagram for ${request.subject}.
    Question: ${request.questionContent}
    Requirements:
    - Clear labels
    - High contrast
    - Simple, clean style
    - Suitable for students
    - White background
  `;
  return enhancedPrompt;
}
```

## Monitoring

### Track AI Usage
```sql
-- Count AI-generated images
SELECT COUNT(*) FROM GeneratedImage 
WHERE generationType = 'AI' 
AND createdAt >= NOW() - INTERVAL '1 day';

-- Calculate costs
SELECT 
  COUNT(*) as ai_images,
  COUNT(*) * 0.02 as estimated_cost
FROM GeneratedImage 
WHERE generationType = 'AI';
```

### Health Check
```bash
GET /api/images/health
```

Response includes AI provider status:
```json
{
  "checks": {
    "aiProviders": {
      "openai": true,
      "stability": false
    }
  }
}
```

## Troubleshooting

### AI Generation Not Working
1. **Check API Key**:
   ```bash
   echo $OPENAI_API_KEY
   ```

2. **Check Logs**:
   ```
   [WARN] AI generation not available or failed
   ```

3. **Test API Key**:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

### High Costs
1. **Check AI usage**:
   ```sql
   SELECT DATE(createdAt), COUNT(*) 
   FROM GeneratedImage 
   WHERE generationType = 'AI'
   GROUP BY DATE(createdAt);
   ```

2. **Increase template coverage**:
   - Add more templates to reduce AI fallback rate
   - Improve keyword matching

3. **Implement caching**:
   - Store generated images
   - Reuse for similar questions

## Recommendations

### For Development
- **Use templates only** (free)
- Set `AI_IMAGE_ENABLED=false`

### For Production
- **Enable DALL-E** for best quality
- Set daily limit: `MAX_AI_IMAGES_PER_DAY=50`
- Monitor costs weekly
- Add more templates to reduce AI usage

### For High Volume
- **Use Stable Diffusion** (cheaper)
- Implement aggressive caching
- Consider self-hosted Stable Diffusion
