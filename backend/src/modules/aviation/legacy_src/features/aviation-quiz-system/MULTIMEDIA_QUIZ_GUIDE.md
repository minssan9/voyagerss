# Multimedia Quiz Generation Guide

Complete guide for generating aviation quizzes with images and videos using Google AI Studio API.

## 🎯 Overview

The enhanced aviation quiz system now supports:
- **Text-based quizzes** (original functionality)
- **Image-enhanced quizzes** (using Google Imagen)
- **Video-enhanced quizzes** (using Google Veo)
- **Comprehensive multimedia quizzes** (text + images + videos)

## 📋 Table of Contents

- [Features](#features)
- [Setup](#setup)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

### 1. Text Quiz Generation
- Standard 4-choice multiple-choice questions
- Professional aviation content
- Detailed explanations
- Real-world applications

### 2. Image Generation (NEW)
- 1-4 educational images per quiz
- AI-extracted visual concepts from quiz content
- Aviation-focused imagery (cockpits, instruments, aircraft)
- Professional, educational quality

### 3. Video Generation (NEW)
- Short educational videos (10-60 seconds)
- AI-generated from quiz content
- Aviation scenarios and concepts
- Smooth, professional animations

### 4. Multimedia Combination
- Text + Multiple Images
- Text + Video
- Text + Images + Video (full multimedia)

---

## 🚀 Setup

### Prerequisites

1. **Google AI Studio API Key**
   ```bash
   # Get your API key from https://aistudio.google.com/app/apikey
   export GOOGLE_AI_API_KEY="your-api-key-here"
   ```

2. **Optional: Google Cloud Project** (for Imagen/Veo)
   ```bash
   # For production image/video generation
   export GOOGLE_CLOUD_PROJECT_ID="your-project-id"
   ```

3. **Install Dependencies**
   ```bash
   npm install @google/generative-ai axios moment-timezone
   ```

### Configuration

#### Basic Setup (Text Only)

```javascript
const GeminiProvider = require('./aiProviders/gemini');
const MessageGenerator = require('./messageGenerator');

const aiProvider = new GeminiProvider(process.env.GOOGLE_AI_API_KEY);
const messageGen = new MessageGenerator(aiProvider);
```

#### Enhanced Setup (Multimedia Support)

```javascript
const GoogleAIStudioEnhanced = require('./aiProviders/googleAIStudioEnhanced');
const MessageGeneratorEnhanced = require('./messageGeneratorEnhanced');

const aiProvider = new GoogleAIStudioEnhanced(process.env.GOOGLE_AI_API_KEY);
const messageGen = new MessageGeneratorEnhanced(aiProvider);
```

---

## 💡 Usage

### 1. Standard Text Quiz

```javascript
// Generate basic text quiz
const quiz = await messageGen.generateCustomQuiz(
  'Engine Failure',
  'Emergency Procedures'
);

console.log(quiz);
// Output: Formatted quiz text with question, choices, and explanation
```

### 2. Quiz with Images

```javascript
// Generate quiz with 2 images
const quizWithImages = await messageGen.generateQuizWithImages(
  'Cockpit Instruments',
  'Navigation Systems',
  2  // number of images
);

console.log(quizWithImages.text);
console.log('Images:', quizWithImages.images.length);

// Access individual images
quizWithImages.images.forEach((image, index) => {
  console.log(`Image ${index + 1}:`, image.url);
  console.log(`Prompt:`, image.prompt);
});
```

### 3. Quiz with Video

```javascript
// Generate quiz with 15-second video
const quizWithVideo = await messageGen.generateQuizWithVideo(
  'Emergency Landing',
  'Emergency Procedures',
  15  // video duration in seconds
);

console.log(quizWithVideo.text);
console.log('Video URL:', quizWithVideo.video.url);
console.log('Video duration:', quizWithVideo.video.duration);
```

### 4. Full Multimedia Quiz

```javascript
// Generate comprehensive multimedia quiz
const multimediaQuiz = await messageGen.generateMultimediaQuiz(
  'ILS Approach',
  'Instrument Flying',
  {
    numImages: 3,           // Generate 3 images
    videoDuration: 20,      // 20-second video
    includeImages: true,    // Include images
    includeVideo: true      // Include video
  }
);

console.log(multimediaQuiz.text);
console.log('Images:', multimediaQuiz.images.length);
console.log('Video:', multimediaQuiz.video ? 'Generated' : 'None');
```

### 5. Telegram Bot Integration

```javascript
// In your command handler
async function handleQuizCommand(chatId, topic, type = 'text') {
  let result;

  switch (type) {
    case 'image':
      result = await messageGen.generateQuizWithImages(topic, topic, 2);
      // Send text
      await bot.sendMessage(chatId, result.text, { parse_mode: 'HTML' });
      // Send images
      for (const image of result.images) {
        if (image.url) {
          await bot.sendPhoto(chatId, image.url);
        }
      }
      break;

    case 'video':
      result = await messageGen.generateQuizWithVideo(topic, topic, 10);
      // Send text
      await bot.sendMessage(chatId, result.text, { parse_mode: 'HTML' });
      // Send video
      if (result.video && result.video.url) {
        await bot.sendVideo(chatId, result.video.url);
      }
      break;

    case 'multimedia':
      result = await messageGen.generateMultimediaQuiz(topic, topic, {
        numImages: 2,
        videoDuration: 15,
        includeImages: true,
        includeVideo: true
      });
      // Send text
      await bot.sendMessage(chatId, result.text, { parse_mode: 'HTML' });
      // Send images
      for (const image of result.images) {
        if (image.url) {
          await bot.sendPhoto(chatId, image.url);
        }
      }
      // Send video
      if (result.video && result.video.url) {
        await bot.sendVideo(chatId, result.video.url);
      }
      break;

    default:
      result = await messageGen.generateCustomQuiz(topic, topic);
      await bot.sendMessage(chatId, result, { parse_mode: 'HTML' });
  }
}

// Register commands
bot.onText(/\/quizimg (.+)/, async (msg, match) => {
  await handleQuizCommand(msg.chat.id, match[1], 'image');
});

bot.onText(/\/quizvid (.+)/, async (msg, match) => {
  await handleQuizCommand(msg.chat.id, match[1], 'video');
});

bot.onText(/\/quizmedia (.+)/, async (msg, match) => {
  await handleQuizCommand(msg.chat.id, match[1], 'multimedia');
});
```

---

## 📚 API Reference

### GoogleAIStudioEnhancedProvider

#### Constructor
```javascript
new GoogleAIStudioEnhancedProvider(apiKey)
```

#### Methods

##### `generateQuiz(topic, knowledgeArea, messageGenerator)`
Generate standard text quiz.

**Parameters:**
- `topic` (string): Quiz topic
- `knowledgeArea` (string): Knowledge area
- `messageGenerator` (object, optional): Message generator instance

**Returns:** `Promise<Object>`
```javascript
{
  prompt: string,
  result: string,
  type: 'text'
}
```

##### `generateQuizWithImages(topic, quizText, numImages)`
Generate quiz with images.

**Parameters:**
- `topic` (string): Quiz topic
- `quizText` (string, optional): Pre-generated quiz text
- `numImages` (number, default: 2): Number of images (1-4)

**Returns:** `Promise<Object>`
```javascript
{
  text: string,
  images: Array<{
    index: number,
    prompt: string,
    url: string,
    status: string
  }>,
  type: 'quiz_with_images',
  metadata: Object
}
```

##### `generateQuizWithVideo(topic, quizText, duration)`
Generate quiz with video.

**Parameters:**
- `topic` (string): Quiz topic
- `quizText` (string, optional): Pre-generated quiz text
- `duration` (number, default: 10): Video duration in seconds (max 60)

**Returns:** `Promise<Object>`
```javascript
{
  text: string,
  video: {
    prompt: string,
    duration: number,
    url: string,
    status: string
  },
  type: 'quiz_with_video',
  metadata: Object
}
```

##### `generateMultimediaQuiz(topic, options)`
Generate comprehensive multimedia quiz.

**Parameters:**
- `topic` (string): Quiz topic
- `options` (object):
  - `numImages` (number, default: 2): Number of images
  - `videoDuration` (number, default: 10): Video duration
  - `includeImages` (boolean, default: true): Include images
  - `includeVideo` (boolean, default: false): Include video

**Returns:** `Promise<Object>`
```javascript
{
  text: string,
  images: Array<Object>,
  video: Object,
  type: 'multimedia_quiz',
  metadata: Object
}
```

### MessageGeneratorEnhanced

#### Constructor
```javascript
new MessageGeneratorEnhanced(aiProvider, aviationKnowledgeService)
```

#### Methods

##### `generateQuizWithImages(topic, knowledgeArea, numImages)`
Generate quiz with images using enhanced provider.

##### `generateQuizWithVideo(topic, knowledgeArea, duration)`
Generate quiz with video using enhanced provider.

##### `generateMultimediaQuiz(topic, knowledgeArea, options)`
Generate full multimedia quiz.

---

## 🎨 Examples

### Example 1: Basic Image Quiz

```javascript
const quiz = await messageGen.generateQuizWithImages(
  'VOR Navigation',
  'Radio Navigation',
  2
);

console.log('Quiz:', quiz.text);
console.log('Generated images:', quiz.images.length);

// Example output:
// Quiz: [Quiz text with question and answers]
// Generated images: 2
// Images: [
//   { index: 0, prompt: 'VOR station...',url: 'https://...' },
//   { index: 1, prompt: 'Aircraft instruments...', url: 'https://...' }
// ]
```

### Example 2: Video Quiz with Telegram

```javascript
bot.onText(/\/quizvid (.+)/, async (msg, match) => {
  const topic = match[1];
  const chatId = msg.chat.id;

  // Send loading message
  await bot.sendMessage(chatId, `🎬 Generating video quiz for: ${topic}...`);

  try {
    const result = await messageGen.generateQuizWithVideo(topic, topic, 15);

    // Send quiz text
    await bot.sendMessage(chatId, result.text, { parse_mode: 'HTML' });

    // Send video if available
    if (result.video && result.video.url) {
      await bot.sendVideo(chatId, result.video.url, {
        caption: `📚 ${topic} - Educational Video`
      });
    } else {
      await bot.sendMessage(chatId, '⚠️ Video generation is being processed...');
    }
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
});
```

### Example 3: Scheduled Multimedia Quiz

```javascript
const schedule = require('node-schedule');

// Send multimedia quiz every day at 9 AM
schedule.scheduleJob('0 9 * * *', async () => {
  const topics = [
    'Engine Systems',
    'Weather Patterns',
    'Emergency Procedures',
    'Navigation Techniques'
  ];

  const randomTopic = topics[Math.floor(Math.random() * topics.length)];

  const quiz = await messageGen.generateMultimediaQuiz(randomTopic, randomTopic, {
    numImages: 2,
    videoDuration: 10,
    includeImages: true,
    includeVideo: Math.random() > 0.5  // 50% chance of video
  });

  // Send to all subscribers
  subscribers.forEach(async (chatId) => {
    await bot.sendMessage(chatId, quiz.text, { parse_mode: 'HTML' });

    for (const image of quiz.images) {
      if (image.url) {
        await bot.sendPhoto(chatId, image.url);
      }
    }

    if (quiz.video && quiz.video.url) {
      await bot.sendVideo(chatId, quiz.video.url);
    }
  });
});
```

---

## 🔧 Troubleshooting

### Issue 1: "Current AI provider does not support image generation"

**Cause:** Using standard provider instead of enhanced provider.

**Solution:**
```javascript
// Change from:
const GeminiProvider = require('./aiProviders/gemini');

// To:
const GoogleAIStudioEnhanced = require('./aiProviders/googleAIStudioEnhanced');
const aiProvider = new GoogleAIStudioEnhanced(process.env.GOOGLE_AI_API_KEY);
```

### Issue 2: Images show "placeholder" status

**Cause:** Imagen API requires Google Cloud Project setup.

**Solution:**
1. Create a Google Cloud Project
2. Enable Vertex AI API
3. Set environment variable:
   ```bash
   export GOOGLE_CLOUD_PROJECT_ID="your-project-id"
   ```

### Issue 3: Video generation fails

**Cause:** Veo API requires special access.

**Solution:**
- Request access to Veo API from Google
- For development, use placeholder videos or static images
- Consider alternative video APIs (Runway, Synthesia)

### Issue 4: API Rate Limits

**Cause:** Too many concurrent requests.

**Solution:**
```javascript
// Add rate limiting
const pLimit = require('p-limit');
const limit = pLimit(2);  // Max 2 concurrent requests

const quizzes = await Promise.all(
  topics.map(topic =>
    limit(() => messageGen.generateQuizWithImages(topic, topic, 1))
  )
);
```

### Issue 5: Memory Issues with Large Videos

**Cause:** Video files are large.

**Solution:**
```javascript
// Stream videos instead of loading to memory
const stream = require('stream');

async function sendVideoStream(chatId, videoUrl) {
  const response = await axios.get(videoUrl, { responseType: 'stream' });
  await bot.sendVideo(chatId, response.data);
}
```

---

## 📊 Performance Considerations

### Response Times

- **Text Quiz**: ~2-5 seconds
- **Quiz with 1 Image**: ~10-15 seconds
- **Quiz with 2-3 Images**: ~20-30 seconds
- **Quiz with Video**: ~30-60 seconds
- **Full Multimedia**: ~60-90 seconds

### Best Practices

1. **Use Async/Await Properly**
   ```javascript
   // Generate images in parallel
   const imagePromises = prompts.map(p => generateImage(p));
   const images = await Promise.all(imagePromises);
   ```

2. **Cache Common Queries**
   ```javascript
   const cache = new Map();

   async function getCachedQuiz(topic) {
     if (cache.has(topic)) {
       return cache.get(topic);
     }
     const quiz = await generateQuiz(topic);
     cache.set(topic, quiz);
     return quiz;
   }
   ```

3. **Implement Retry Logic**
   ```javascript
   async function retryGeneration(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(r => setTimeout(r, 1000 * (i + 1)));
       }
     }
   }
   ```

4. **Handle Failures Gracefully**
   ```javascript
   const quiz = await messageGen.generateQuizWithImages(topic, topic, 3);

   if (quiz.images.length === 0) {
     // Fallback to text-only
     await bot.sendMessage(chatId, quiz.text);
   } else {
     // Send with available images
     await bot.sendMessage(chatId, quiz.text);
     for (const img of quiz.images.filter(i => i.status === 'success')) {
       await bot.sendPhoto(chatId, img.url);
     }
   }
   ```

---

## 🔒 Security Notes

1. **API Key Protection**
   - Never commit API keys to version control
   - Use environment variables
   - Rotate keys regularly

2. **Input Validation**
   ```javascript
   function validateTopic(topic) {
     if (!topic || topic.length > 100) {
       throw new Error('Invalid topic');
     }
     // Remove potentially harmful content
     return topic.replace(/[<>]/g, '');
   }
   ```

3. **Rate Limiting**
   ```javascript
   const rateLimit = require('express-rate-limit');

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000,  // 15 minutes
     max: 10  // 10 requests per window
   });

   app.use('/api/quiz', limiter);
   ```

---

## 📝 License

This project is licensed under the ISC License.

---

## 🤝 Support

For issues and questions:
- Create an issue on GitHub
- Check Google AI Studio documentation
- Review error logs

---

## 🔄 Updates

### Version 2.0 (Current)
- ✅ Enhanced multimedia quiz generation
- ✅ Google Imagen integration
- ✅ Google Veo integration
- ✅ Concurrent image generation
- ✅ Fallback mechanisms
- ✅ Error handling improvements

### Version 1.0 (Previous)
- Text-only quiz generation
- Basic AI provider support
