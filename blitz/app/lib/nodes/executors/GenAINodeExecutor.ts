import { perplexity } from '@ai-sdk/perplexity';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { GenAIConfig, NodeData } from '@/app/lib/types/workflow';
import { ExecutionContext, GenAIExecutionResult, ExecutionError } from '../types/execution';

export class GenAINodeExecutor {
  private config: GenAIConfig;

  constructor(nodeData: NodeData & { genAIConfig?: GenAIConfig }) {
    if (!nodeData.genAIConfig) {
      throw new Error('GenAI configuration is missing');
    }
    // Validate that required fields are present
    if (!nodeData.genAIConfig.model || !nodeData.genAIConfig.apiKey) {
      throw new Error('GenAI configuration is incomplete: model and apiKey are required');
    }
    this.config = nodeData.genAIConfig;
  }

  /**
   * Validates the GenAI node configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.model) {
      errors.push('Model is required');
    }

    if (!this.config.apiKey) {
      errors.push('API key is required');
    }

    // Validate supported models
    // Perplexity models: 'sonar-pro', 'sonar', etc.
    const supportedModels = [
      'sonar-pro', 'sonar', 'sonar-pro-online', 'sonar-pro-chat',
      'gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'
    ];
    
    if (this.config.model && !supportedModels.includes(this.config.model)) {
      errors.push(`Model "${this.config.model}" is not supported. Supported models are: ${supportedModels.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Executes the GenAI node to detect intent from user message
   */
  async execute(
    message: string,
    context: ExecutionContext
  ): Promise<GenAIExecutionResult> {
    // Validate configuration first
    const validation = this.validateConfig();
    if (!validation.valid) {
      throw {
        code: 'GENAI_CONFIG_ERROR',
        message: `GenAI node configuration invalid: ${validation.errors.join(', ')}`,
      } as ExecutionError;
    }

    // Use default system prompt (temperature is fixed at 0.2 for consistent intent detection)
    const systemPrompt = this.getDefaultSystemPrompt();
    const temperature = 0.2; // Fixed low temperature for consistent, deterministic intent detection

    // Get conversation history
    const conversationHistory = context.conversationHistory || [];

    // Determine provider based on model
    // Perplexity models: 'sonar-pro', 'sonar', etc.
    // Model is already validated, so we can safely assert it's defined
    const model = this.config.model!; // Non-null assertion since we validate in constructor
    const isPerplexity = model.startsWith('sonar') ||
                         ['sonar', 'sonar-pro', 'sonar-pro-online', 'sonar-pro-chat'].includes(model);
    const isGemini = model.startsWith('gemini-');
    
    if (!isPerplexity && !isGemini) {
      throw {
        code: 'GENAI_CONFIG_ERROR',
        message: `Unsupported model: "${model}". Please select a supported model.`,
      } as ExecutionError;
    }

    // Get API key - ALWAYS use the one from config (from DB), not from env
    // This ensures each workflow uses its own API key
    const apiKey = this.config.apiKey;
    
    if (!apiKey) {
      const provider = isPerplexity ? 'Perplexity' : 'Google Gemini';
      throw {
        code: 'GENAI_CONFIG_ERROR',
        message: `API key is required for ${provider}. Please configure your API key in the GenAI node settings.`,
      } as ExecutionError;
    }

    // Get the model provider
    // Note: The AI SDK providers read API keys from environment variables
    // We need to temporarily set the env var for this request
    const envVarName = isPerplexity ? 'PERPLEXITY_API_KEY' : 'GOOGLE_GENERATIVE_AI_API_KEY';
    const originalApiKey = process.env[envVarName];
    
    // Set the API key from config (DB) for this execution
    process.env[envVarName] = apiKey;

    let modelProvider;
    let text: string;

    try {
      if (isPerplexity) {
        // Perplexity SDK expects 'sonar-pro', 'sonar', etc.
        modelProvider = perplexity(model as any);
      } else if (isGemini) {
        // Gemini - model is already validated to be a gemini model
        modelProvider = google(model as 'gemini-pro' | 'gemini-1.5-pro' | 'gemini-1.5-flash');
      } else {
        throw new Error(`Unsupported model: ${model}`);
      }

      // Prepare messages array for AI SDK
      // The conversationHistory already contains all previous messages in order
      // We add the current user message at the end
      // Note: AI SDK requires messages to alternate between user and assistant
      // Start with conversation history and add current message
      let messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

      // Add conversation history (filter out empty messages)
      for (const msg of conversationHistory) {
        if (msg.content && typeof msg.content === 'string' && msg.content.trim().length > 0) {
          messages.push({
            role: msg.role,
            content: msg.content.trim(),
          });
        }
      }

      // Add current user message
      if (message && message.trim().length > 0) {
        messages.push({
          role: 'user' as const,
          content: message.trim(),
        });
      }

      // Validate and fix message alternation if needed
      // AI SDK requires messages to alternate: user -> assistant -> user -> assistant
      // If we have consecutive messages of the same role, we need to fix it
      const fixedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      for (let i = 0; i < messages.length; i++) {
        const current = messages[i];
        const previous = fixedMessages[fixedMessages.length - 1];

        // If this is the first message, just add it
        if (!previous) {
          // Ensure first message is always user (AI SDK requirement)
          if (current.role === 'user') {
            fixedMessages.push(current);
          } else {
            // If first message is assistant, skip it (shouldn't happen, but handle it)
            console.warn('[GenAINodeExecutor] First message is assistant, skipping:', current.content.substring(0, 50));
          }
        } else {
          // If roles are different, add the message
          if (current.role !== previous.role) {
            fixedMessages.push(current);
          } else {
            // If roles are the same, merge content or skip duplicate
            console.warn('[GenAINodeExecutor] Consecutive messages with same role detected. Merging content.');
            // Merge content into previous message
            fixedMessages[fixedMessages.length - 1] = {
              role: previous.role,
              content: previous.content + '\n\n' + current.content,
            };
          }
        }
      }

      // Final validation: ensure we have at least one user message
      if (fixedMessages.length === 0) {
        throw {
          code: 'GENAI_EXECUTION_ERROR',
          message: 'No valid messages to send to AI. Conversation history is empty or invalid.',
        } as ExecutionError;
      }

      // Log message structure for debugging
      console.log('[GenAINodeExecutor] Message structure:', {
        originalMessageCount: messages.length,
        fixedMessageCount: fixedMessages.length,
        messageRoles: fixedMessages.map((m) => m.role),
        firstMessageRole: fixedMessages[0]?.role,
        lastMessageRole: fixedMessages[fixedMessages.length - 1]?.role,
      });

      // Use fixed messages
      messages = fixedMessages;

      // Call AI API (Perplexity or Gemini)
      const result = await generateText({
        model: modelProvider,
        system: systemPrompt,
        messages,
        temperature,
      });

      text = result.text;
    } catch (error) {
      console.error('[GenAINodeExecutor] Execution error:', error);
      
      // Return error response
      throw {
        code: 'GENAI_EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to execute GenAI node',
        details: {
          model: this.config.model,
          error: error instanceof Error ? error.stack : String(error),
        },
      } as ExecutionError;
    } finally {
      // Always restore original API key, even on error
      if (originalApiKey !== undefined) {
        process.env[envVarName] = originalApiKey;
      } else {
        delete process.env[envVarName];
      }
    }

    const assistantResponse = text;

    // Parse intent from response
    let detectedIntent: 'general_query' | 'cancellation' | 'order_query' | 'refund_query' = 'general_query';
    let extractedData: Record<string, unknown> = {};

    // Try to parse JSON response if it's not a general query
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.intent && ['cancellation', 'order_query', 'refund_query'].includes(parsed.intent)) {
          detectedIntent = parsed.intent;
          extractedData = parsed.data || {};
        }
      }
    } catch (parseError) {
      // If JSON parsing fails, treat as general query
      console.debug('Failed to parse JSON from GenAI response, treating as general query:', parseError);
    }

    // Determine response method
    const method: 'GENAI_TO_FRONTEND' | 'FRONTEND_TO_BLITZ' =
      detectedIntent === 'general_query' ? 'GENAI_TO_FRONTEND' : 'FRONTEND_TO_BLITZ';

    // Log for debugging
    console.log('[GenAINodeExecutor] Execution result:', {
      intent: detectedIntent,
      extractedData,
      method,
      responseLength: assistantResponse.length,
    });

    return {
      intent: detectedIntent,
      response: assistantResponse,
      extractedData: Object.keys(extractedData).length > 0 ? extractedData : undefined,
      method,
    };
  }

  /**
   * Gets the default system prompt for intent detection
   */
  private getDefaultSystemPrompt(): string {
    return `You are an intent detection system for an e-commerce chatbot. Your task is to analyze user messages and categorize them into one of these intents:

1. **general_query**: General questions, greetings, or non-actionable queries that can be answered directly
2. **cancellation**: Requests to cancel an order
3. **order_query**: Questions about order status, tracking, or order details
4. **refund_query**: Requests for refunds or questions about refunds

For general queries, provide a helpful, concise answer directly.
For other intents, extract relevant information (like order IDs, product names, etc.) and respond in JSON format.

Response format:
- If general_query: Return a simple text response
- If other intent: Return JSON with this structure:
{
  "intent": "cancellation" | "order_query" | "refund_query",
  "data": {
    "orderId": "string (if mentioned)",
    "reason": "string (if mentioned)",
    "productName": "string (if mentioned)",
    // any other relevant extracted data
  }
}`;
  }

  /**
   * Tests the GenAI node configuration with a sample message
   */
  async test(message: string = 'Hello, where is my order?'): Promise<GenAIExecutionResult> {
    const testContext: ExecutionContext = {
      businessId: 'test',
      userId: 'test',
      conversationHistory: [],
    };

    return this.execute(message, testContext);
  }
}
