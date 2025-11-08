import { GenAIIntent, IntentType } from '@/app/lib/types/workflow';

/**
 * Maps GenAI detected intents to Router intent types
 * This is a hardcoded mapping based on the system prompt
 */
export function mapGenAIIntentToRouterIntent(genAIIntent: GenAIIntent): IntentType | null {
  const mapping: Record<GenAIIntent, IntentType | null> = {
    'general_query': null, // General queries don't route to modules
    'cancellation': 'CANCEL_ORDER',
    'order_query': 'TRACK_SHIPMENT',
    'refund_query': 'FAQ_SUPPORT', // For now, route refunds to FAQ - can be updated later
  };

  return mapping[genAIIntent] || null;
}

/**
 * Gets the human-readable name for a GenAI intent
 */
export function getGenAIIntentName(intent: GenAIIntent): string {
  const names: Record<GenAIIntent, string> = {
    'general_query': 'General Query',
    'cancellation': 'Cancellation',
    'order_query': 'Order Query',
    'refund_query': 'Refund Query',
  };

  return names[intent] || intent;
}

/**
 * Gets the human-readable name for a Router intent
 */
export function getRouterIntentName(intent: IntentType): string {
  const names: Record<IntentType, string> = {
    'TRACK_SHIPMENT': 'Track Shipment',
    'CANCEL_ORDER': 'Cancel Order',
    'FAQ_SUPPORT': 'FAQ Support',
  };

  return names[intent] || intent;
}

/**
 * Validates if a GenAI intent requires routing to a module
 */
export function requiresModuleRouting(intent: GenAIIntent): boolean {
  return intent !== 'general_query';
}

