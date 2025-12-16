/**
 * Multimedia Quiz Generation Example
 * Demonstrates how to use the enhanced quiz generation features
 */

const GoogleAIStudioEnhanced = require('../message-generation/aiProviders/googleAIStudioEnhanced');
const MessageGeneratorEnhanced = require('../message-generation/messageGeneratorEnhanced');

// ============================================
// SETUP
// ============================================

// Initialize the enhanced AI provider
const apiKey = process.env.GOOGLE_AI_API_KEY || 'your-api-key-here';
const aiProvider = new GoogleAIStudioEnhanced(apiKey);

// Initialize the enhanced message generator
const messageGen = new MessageGeneratorEnhanced(aiProvider);

// ============================================
// EXAMPLE 1: Text-Only Quiz (Standard)
// ============================================

async function example1_TextQuiz() {
  console.log('='.repeat(60));
  console.log('EXAMPLE 1: Standard Text Quiz');
  console.log('='.repeat(60));

  try {
    const quiz = await messageGen.generateCustomQuiz(
      'VOR Navigation',
      'Radio Navigation Systems'
    );

    console.log('\n📝 Generated Quiz:\n');
    console.log(quiz);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// ============================================
// EXAMPLE 2: Quiz with Images
// ============================================

async function example2_QuizWithImages() {
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE 2: Quiz with Images');
  console.log('='.repeat(60));

  try {
    const result = await messageGen.generateQuizWithImages(
      'Cockpit Instruments',
      'Flight Instruments and Avionics',
      2  // Generate 2 images
    );

    console.log('\n📝 Quiz Text:\n');
    console.log(result.text);

    console.log('\n🖼️ Generated Images:');
    result.images.forEach((image, index) => {
      console.log(`\nImage ${index + 1}:`);
      console.log(`  Prompt: ${image.prompt}`);
      console.log(`  Status: ${image.status}`);
      console.log(`  URL: ${image.url || 'N/A'}`);
    });

    console.log(`\n✅ Total images generated: ${result.images.length}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// ============================================
// EXAMPLE 3: Quiz with Video
// ============================================

async function example3_QuizWithVideo() {
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE 3: Quiz with Video');
  console.log('='.repeat(60));

  try {
    const result = await messageGen.generateQuizWithVideo(
      'Emergency Landing Procedures',
      'Emergency Procedures',
      15  // 15-second video
    );

    console.log('\n📝 Quiz Text:\n');
    console.log(result.text);

    console.log('\n🎬 Video Information:');
    console.log(`  Prompt: ${result.video.prompt}`);
    console.log(`  Duration: ${result.video.duration} seconds`);
    console.log(`  Status: ${result.video.status}`);
    console.log(`  URL: ${result.video.url || 'N/A'}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// ============================================
// EXAMPLE 4: Full Multimedia Quiz
// ============================================

async function example4_MultimediaQuiz() {
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE 4: Full Multimedia Quiz');
  console.log('='.repeat(60));

  try {
    const result = await messageGen.generateMultimediaQuiz(
      'ILS Approach Procedures',
      'Instrument Flying',
      {
        numImages: 3,
        videoDuration: 20,
        includeImages: true,
        includeVideo: true
      }
    );

    console.log('\n📝 Quiz Text:\n');
    console.log(result.text);

    console.log('\n🖼️ Images:');
    result.images.forEach((image, index) => {
      console.log(`  ${index + 1}. ${image.status} - ${image.prompt.substring(0, 50)}...`);
    });

    console.log('\n🎬 Video:');
    if (result.video) {
      console.log(`  Status: ${result.video.status}`);
      console.log(`  Duration: ${result.video.duration}s`);
    } else {
      console.log('  No video generated');
    }

    console.log('\n📊 Summary:');
    console.log(`  Type: ${result.type}`);
    console.log(`  Images: ${result.images.length}`);
    console.log(`  Video: ${result.video ? 'Yes' : 'No'}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// ============================================
// EXAMPLE 5: Batch Quiz Generation
// ============================================

async function example5_BatchGeneration() {
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE 5: Batch Quiz Generation');
  console.log('='.repeat(60));

  const topics = [
    'Engine Failure',
    'Weather Hazards',
    'Radio Communication'
  ];

  try {
    console.log(`\n🚀 Generating ${topics.length} quizzes with images...\n`);

    const quizzes = await Promise.all(
      topics.map(async (topic, index) => {
        console.log(`  [${index + 1}/${topics.length}] Generating: ${topic}...`);

        const result = await messageGen.generateQuizWithImages(topic, topic, 1);

        return {
          topic,
          text: result.text,
          images: result.images.length,
          status: result.type
        };
      })
    );

    console.log('\n✅ Batch Generation Complete:\n');
    quizzes.forEach((quiz, index) => {
      console.log(`${index + 1}. ${quiz.topic}`);
      console.log(`   Status: ${quiz.status}`);
      console.log(`   Images: ${quiz.images}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// ============================================
// EXAMPLE 6: Error Handling and Fallbacks
// ============================================

async function example6_ErrorHandling() {
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE 6: Error Handling and Fallbacks');
  console.log('='.repeat(60));

  try {
    console.log('\n🔧 Attempting to generate quiz with graceful fallback...\n');

    const result = await messageGen.generateQuizWithImages(
      'Advanced Aerodynamics',
      'Flight Mechanics',
      4  // Request 4 images
    );

    console.log('Quiz generated successfully!');
    console.log(`Requested: 4 images`);
    console.log(`Generated: ${result.images.length} images`);

    // Check for partial failures
    const successful = result.images.filter(img => img.status === 'success');
    const failed = result.images.filter(img => img.status === 'failed');

    console.log(`\n📊 Results:`);
    console.log(`  ✅ Successful: ${successful.length}`);
    console.log(`  ❌ Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log('\n⚠️ Failed images:');
      failed.forEach((img, index) => {
        console.log(`  ${index + 1}. ${img.error}`);
      });
    }

    // Always have quiz text even if images fail
    console.log('\n📝 Quiz text is always available:');
    console.log(`  Length: ${result.text.length} characters`);
    console.log(`  Type: ${result.type}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// ============================================
// EXAMPLE 7: Telegram Bot Integration
// ============================================

async function example7_TelegramIntegration() {
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE 7: Telegram Bot Integration Pattern');
  console.log('='.repeat(60));

  // Simulated Telegram bot functions
  const mockBot = {
    sendMessage: async (chatId, text, options) => {
      console.log(`\n📤 Sending message to ${chatId}:`);
      console.log(`   ${text.substring(0, 100)}...`);
    },
    sendPhoto: async (chatId, photo) => {
      console.log(`📸 Sending photo to ${chatId}: ${photo.substring(0, 50)}...`);
    },
    sendVideo: async (chatId, video) => {
      console.log(`🎬 Sending video to ${chatId}: ${video.substring(0, 50)}...`);
    }
  };

  try {
    const chatId = '123456789';
    const topic = 'Turbulence and Weather';

    console.log(`\n🤖 Simulating Telegram bot quiz generation for: ${topic}\n`);

    // Generate multimedia quiz
    const result = await messageGen.generateMultimediaQuiz(topic, topic, {
      numImages: 2,
      videoDuration: 10,
      includeImages: true,
      includeVideo: false
    });

    // Send text message
    await mockBot.sendMessage(chatId, result.text, { parse_mode: 'HTML' });

    // Send images
    for (const image of result.images) {
      if (image.url) {
        await mockBot.sendPhoto(chatId, image.url);
      }
    }

    // Send video if available
    if (result.video && result.video.url) {
      await mockBot.sendVideo(chatId, result.video.url);
    }

    console.log('\n✅ Telegram integration complete!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// ============================================
// EXAMPLE 8: Custom Image Prompts
// ============================================

async function example8_CustomImagePrompts() {
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE 8: How Image Prompts are Generated');
  console.log('='.repeat(60));

  const sampleQuizText = `
**문제:**
항공기가 ILS 접근 중 Glideslope 지시계가 한 점 아래로 내려간 경우, 조종사는 어떻게 해야 하는가?

**선택지:**
A) 상승하여 Glideslope에 재진입한다
B) 하강률을 증가시킨다
C) 현재 고도를 유지한다
D) 접근을 중단하고 복행한다

**정답:** A

**해설:**
Glideslope 지시계가 한 점 아래로 내려갔다는 것은 항공기가 정상 강하경로보다 위에 있음을 의미합니다.
  `;

  console.log('\n📝 Sample Quiz Text:');
  console.log(sampleQuizText);

  console.log('\n🎨 AI will generate image prompts like:');
  console.log('  1. "Professional cockpit view showing ILS instruments and glideslope indicator, detailed avionics, educational quality"');
  console.log('  2. "Aircraft on ILS approach with glideslope visualization, runway in view, technical illustration"');

  console.log('\n💡 Tips for better image generation:');
  console.log('  • Use specific aviation topics');
  console.log('  • Include technical details in quiz text');
  console.log('  • Mention specific instruments or equipment');
  console.log('  • Describe scenarios clearly');
}

// ============================================
// MAIN EXECUTION
// ============================================

async function runAllExamples() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   MULTIMEDIA QUIZ GENERATION - EXAMPLES                   ║');
  console.log('║   Aviation Quiz System with Google AI Studio             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  try {
    // Run examples
    await example1_TextQuiz();
    await example2_QuizWithImages();
    await example3_QuizWithVideo();
    await example4_MultimediaQuiz();
    await example5_BatchGeneration();
    await example6_ErrorHandling();
    await example7_TelegramIntegration();
    await example8_CustomImagePrompts();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All examples completed!');
    console.log('='.repeat(60));
    console.log('\n💡 Next steps:');
    console.log('  1. Set your GOOGLE_AI_API_KEY environment variable');
    console.log('  2. Integrate into your Telegram bot');
    console.log('  3. Test with real aviation topics');
    console.log('  4. Review MULTIMEDIA_QUIZ_GUIDE.md for more details\n');
  } catch (error) {
    console.error('\n❌ Example execution failed:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

// Export for use in other modules
module.exports = {
  example1_TextQuiz,
  example2_QuizWithImages,
  example3_QuizWithVideo,
  example4_MultimediaQuiz,
  example5_BatchGeneration,
  example6_ErrorHandling,
  example7_TelegramIntegration,
  example8_CustomImagePrompts,
  runAllExamples
};
