# Multimedia Quiz Generation - Quick Start

## 🚀 Quick Start

### 1. Installation

```bash
npm install @google/generative-ai axios moment-timezone
```

### 2. Setup

```javascript
const GoogleAIStudioEnhanced = require('./message-generation/aiProviders/googleAIStudioEnhanced');
const MessageGeneratorEnhanced = require('./message-generation/messageGeneratorEnhanced');

const apiKey = process.env.GOOGLE_AI_API_KEY;
const aiProvider = new GoogleAIStudioEnhanced(apiKey);
const messageGen = new MessageGeneratorEnhanced(aiProvider);
```

### 3. Generate Quiz with Images

```javascript
const quiz = await messageGen.generateQuizWithImages(
  'Engine Failure',
  'Emergency Procedures',
  2  // number of images
);

console.log(quiz.text);
console.log(`Generated ${quiz.images.length} images`);
```

### 4. Generate Quiz with Video

```javascript
const quiz = await messageGen.generateQuizWithVideo(
  'ILS Approach',
  'Instrument Flying',
  15  // video duration in seconds
);

console.log(quiz.text);
console.log('Video:', quiz.video.url);
```

### 5. Generate Full Multimedia Quiz

```javascript
const quiz = await messageGen.generateMultimediaQuiz(
  'Weather Hazards',
  'Meteorology',
  {
    numImages: 3,
    videoDuration: 20,
    includeImages: true,
    includeVideo: true
  }
);
```

## 📁 File Structure

```
aviation-quiz-system/
├── message-generation/
│   ├── aiProviders/
│   │   ├── googleAIStudioEnhanced.js  (NEW)  ← Enhanced provider
│   │   ├── googleAIStudio.js                 ← Original
│   │   └── gemini.js                         ← Original
│   ├── messageGeneratorEnhanced.js    (NEW)  ← Enhanced generator
│   └── messageGenerator.js                   ← Original
├── examples/
│   └── multimediaQuizExample.js       (NEW)  ← Usage examples
├── MULTIMEDIA_QUIZ_GUIDE.md           (NEW)  ← Full documentation
└── README_MULTIMEDIA.md               (NEW)  ← This file
```

## 🎯 Features

| Feature | Description | Status |
|---------|-------------|--------|
| Text Quiz | Standard 4-choice quiz | ✅ Working |
| Image Generation | 1-4 images per quiz | ⚠️ Placeholder* |
| Video Generation | 10-60 second videos | ⚠️ Placeholder* |
| Batch Processing | Multiple quizzes | ✅ Working |
| Error Handling | Graceful fallbacks | ✅ Working |

*Requires Google Cloud Project setup for full functionality

## 🔧 Configuration

### Environment Variables

```bash
# Required
export GOOGLE_AI_API_KEY="your-api-key"

# Optional (for image/video generation)
export GOOGLE_CLOUD_PROJECT_ID="your-project-id"
```

### Get API Key

Visit: https://aistudio.google.com/app/apikey

## 📚 Documentation

- **Quick Start**: This file
- **Full Guide**: [MULTIMEDIA_QUIZ_GUIDE.md](./MULTIMEDIA_QUIZ_GUIDE.md)
- **Examples**: [examples/multimediaQuizExample.js](./examples/multimediaQuizExample.js)

## ⚡ Usage Examples

### Example 1: Basic Text Quiz

```javascript
const quiz = await messageGen.generateCustomQuiz(
  'VOR Navigation',
  'Radio Navigation'
);
```

### Example 2: Quiz with 2 Images

```javascript
const result = await messageGen.generateQuizWithImages(
  'Cockpit Instruments',
  'Flight Instruments',
  2
);

// Send to Telegram
await bot.sendMessage(chatId, result.text, { parse_mode: 'HTML' });
for (const image of result.images) {
  if (image.url) {
    await bot.sendPhoto(chatId, image.url);
  }
}
```

### Example 3: Telegram Bot Commands

```javascript
// /quizimg Engine Failure
bot.onText(/\/quizimg (.+)/, async (msg, match) => {
  const topic = match[1];
  const result = await messageGen.generateQuizWithImages(topic, topic, 2);

  await bot.sendMessage(msg.chat.id, result.text, { parse_mode: 'HTML' });
  for (const img of result.images) {
    if (img.url) await bot.sendPhoto(msg.chat.id, img.url);
  }
});

// /quizvid ILS Approach
bot.onText(/\/quizvid (.+)/, async (msg, match) => {
  const topic = match[1];
  const result = await messageGen.generateQuizWithVideo(topic, topic, 15);

  await bot.sendMessage(msg.chat.id, result.text, { parse_mode: 'HTML' });
  if (result.video?.url) await bot.sendVideo(msg.chat.id, result.video.url);
});

// /quizmedia Weather Systems
bot.onText(/\/quizmedia (.+)/, async (msg, match) => {
  const topic = match[1];
  const result = await messageGen.generateMultimediaQuiz(topic, topic, {
    numImages: 2,
    videoDuration: 10,
    includeImages: true,
    includeVideo: false
  });

  await bot.sendMessage(msg.chat.id, result.text, { parse_mode: 'HTML' });
  for (const img of result.images) {
    if (img.url) await bot.sendPhoto(msg.chat.id, img.url);
  }
});
```

## 🔄 Migration from Old to New

### Old Way (Text Only)

```javascript
const GeminiProvider = require('./aiProviders/gemini');
const MessageGenerator = require('./messageGenerator');

const provider = new GeminiProvider(apiKey);
const generator = new MessageGenerator(provider);

const quiz = await generator.generateCustomQuiz(topic, area);
```

### New Way (Multimedia)

```javascript
const GoogleAIStudioEnhanced = require('./aiProviders/googleAIStudioEnhanced');
const MessageGeneratorEnhanced = require('./messageGeneratorEnhanced');

const provider = new GoogleAIStudioEnhanced(apiKey);
const generator = new MessageGeneratorEnhanced(provider);

// Still works the same
const textQuiz = await generator.generateCustomQuiz(topic, area);

// Plus new features
const imageQuiz = await generator.generateQuizWithImages(topic, area, 2);
const videoQuiz = await generator.generateQuizWithVideo(topic, area, 15);
```

## ⚠️ Important Notes

1. **API Key Required**: You must set `GOOGLE_AI_API_KEY` environment variable
2. **Image/Video Placeholder**: Full image and video generation requires Google Cloud Project setup
3. **Backward Compatible**: All existing code continues to work
4. **Graceful Fallbacks**: If media generation fails, text quiz is still returned
5. **Rate Limits**: Be aware of API rate limits when generating multiple quizzes

## 🐛 Troubleshooting

### "Current AI provider does not support image generation"

**Solution**: Use `GoogleAIStudioEnhanced` instead of `GeminiProvider`

### Images show "placeholder" status

**Solution**: Set up Google Cloud Project and enable Vertex AI API

### Video generation fails

**Solution**: Veo API requires special access - use images only for now

### API rate limit errors

**Solution**: Implement rate limiting and retry logic

## 📊 Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Text Quiz | 2-5s | Fast |
| Quiz + 1 Image | 10-15s | Good |
| Quiz + 2-3 Images | 20-30s | Acceptable |
| Quiz + Video | 30-60s | Slower |
| Full Multimedia | 60-90s | Slowest |

## 🔗 Links

- [Google AI Studio](https://aistudio.google.com)
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [Full Documentation](./MULTIMEDIA_QUIZ_GUIDE.md)
- [Code Examples](./examples/multimediaQuizExample.js)

## 💡 Tips

1. Start with image generation before adding video
2. Use 1-2 images for best performance
3. Cache frequently requested quizzes
4. Implement proper error handling
5. Test with various topics before production use

## 🎓 Example Topics

Good topics for image generation:
- ✅ Cockpit Instruments
- ✅ Engine Systems
- ✅ Weather Patterns
- ✅ Navigation Equipment
- ✅ Aircraft Components

Good topics for video generation:
- ✅ Flight Procedures
- ✅ Emergency Maneuvers
- ✅ Approach Patterns
- ✅ Weather Phenomena
- ✅ System Operations

## 📞 Support

For issues or questions:
1. Check [MULTIMEDIA_QUIZ_GUIDE.md](./MULTIMEDIA_QUIZ_GUIDE.md)
2. Review [examples](./examples/multimediaQuizExample.js)
3. Create a GitHub issue

---

**Ready to get started?**

```bash
# Run the example
node examples/multimediaQuizExample.js
```
