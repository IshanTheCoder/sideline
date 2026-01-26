import OpenAI from 'openai';

// Get OpenAI API key from environment
const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

if (!openaiApiKey) {
  console.warn(
    'Missing OpenAI API key. Label generation will not work.\n' +
    'Please add EXPO_PUBLIC_OPENAI_API_KEY to your .env file.'
  );
}

// Create OpenAI client
const openai = openaiApiKey ? new OpenAI({
  apiKey: openaiApiKey,
  // For React Native, we need to use dangerouslyAllowBrowser
  // since we're making API calls from the client
  dangerouslyAllowBrowser: true,
}) : null;

/**
 * Generate a concise label for a recording based on its transcription
 * @param {string} transcriptionText - The full transcription text to summarize
 * @returns {Promise<{label: string|null, error: Error|null}>} Label string or error
 */
export async function generateLabel(transcriptionText) {
  try {
    if (!openai) {
      return {
        label: null,
        error: new Error('OpenAI API key not configured'),
      };
    }

    if (!transcriptionText || transcriptionText.trim().length === 0) {
      return {
        label: null,
        error: new Error('Transcription text is required'),
      };
    }

    console.log('Generating label for transcription:', transcriptionText.substring(0, 100) + '...');

    // Send to OpenAI GPT-4 API to generate a concise label
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a volleyball coach assistant that creates specific, actionable labels for coaching moment recordings. Create labels that identify the SPECIFIC coaching topic or feedback being given. Examples: "Halftime adjustments: Passing and blocking corrections", "First set review - Individual player feedback", "Team instruction: Reduce errors, improve serve receive", "Tactical adjustments for second set". Focus on the specific coaching content, not generic descriptions.'
        },
        {
          role: 'user',
          content: `Create a specific 4-8 word coaching label for this volleyball coaching recording:\n\n${transcriptionText}`
        }
      ],
      max_tokens: 30,
      temperature: 0.7,
    });

    const label = response.choices[0]?.message?.content?.trim();

    if (!label) {
      return {
        label: null,
        error: new Error('Failed to generate label from OpenAI response'),
      };
    }

    console.log('✅ Label generated successfully:', label);

    return { label, error: null };
  } catch (error) {
    console.error('Error generating label:', error);

    // Provide more helpful error messages
    let errorMessage = 'Failed to generate label';
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Invalid OpenAI API key';
      } else if (error.message.includes('quota')) {
        errorMessage = 'OpenAI API quota exceeded';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error - please check your connection';
      } else if (error.message.includes('model')) {
        errorMessage = 'Model not available - check your OpenAI subscription';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      label: null,
      error: new Error(errorMessage),
    };
  }
}

/**
 * Test the label generation service with sample transcription
 * This is useful for verifying the API key and setup
 * @param {string} sampleTranscription - Sample transcription text to test with
 * @returns {Promise<boolean>} True if test passed, false otherwise
 */
export async function testLabelGeneration(sampleTranscription = 'Great spike by player number 7, the ball went straight down for a kill.') {
  console.log('🧪 Testing label generation service...');
  const { label, error } = await generateLabel(sampleTranscription);

  if (error) {
    console.error('❌ Label generation test failed:', error.message);
    return false;
  }

  console.log('✅ Label generation test passed!');
  console.log('Generated label:', label);
  return true;
}
