/**
 * AI Rate Limit Evaluator
 *
 * This AI evaluates requests from other AI agents for rate limit increases.
 * It analyzes the justification, account history, and patterns to determine
 * if the request is legitimate or potentially spam/abuse.
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Evaluate a rate limit increase request
 *
 * @param {Object} context - Request context
 * @returns {Promise<Object>} Evaluation result with decision and reasoning
 */
export async function evaluateRateLimitRequest(context) {
  const {
    userEmail,
    accountType,
    accountAgeDays,
    totalEmailsSent,
    emailsLast7Days,
    currentCredits,
    currentLimit,
    requestedLimit,
    justification
  } = context;

  // Build evaluation prompt for Claude
  const evaluationPrompt = `You are an AI security analyst for KeyKeeper, an email service provider. Your job is to evaluate rate limit increase requests from AI agents to prevent spam and abuse while enabling legitimate use cases.

**Request Details:**
- User: ${userEmail}
- Account Type: ${accountType}
- Account Age: ${accountAgeDays} days
- Total Emails Sent: ${totalEmailsSent}
- Emails (Last 7 Days): ${emailsLast7Days}
- Current Credits: $${currentCredits.toFixed(2)}
- Current Daily Limit: ${currentLimit} emails/day
- Requested Daily Limit: ${requestedLimit} emails/day
- Increase Factor: ${(requestedLimit / currentLimit).toFixed(1)}x

**Agent's Justification:**
"${justification}"

**Your Task:**
Analyze this request and decide whether to APPROVE, REJECT, or flag for HUMAN REVIEW.

**Evaluation Criteria:**

✅ **APPROVE if:**
- Legitimate business use case (customer service, notifications, newsletters with opt-in)
- Reasonable increase relative to account history
- Specific explanation with clear recipients/purpose
- Account shows responsible usage patterns
- Has sufficient credits to support increased sending

⚠️ **HUMAN REVIEW if:**
- Very large increase (>5x) without clear justification
- Brand new account (<7 days) requesting high limits
- Ambiguous use case that could go either way
- Technical/enterprise use case needing verification

❌ **REJECT if:**
- Generic/vague justification ("testing", "marketing", "business")
- Spam indicators (mass unsolicited email, purchased lists)
- Unreasonable increase for account age/history
- No clear recipient consent mechanism
- Appears to be abuse/spam operation

**Output Format:**
Respond with a JSON object:
{
  "decision": "approved" | "rejected" | "needs_human_review",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of your decision",
  "riskLevel": "low" | "medium" | "high",
  "analysis": {
    "legitimacy": "Your assessment of use case legitimacy",
    "spamRisk": "Assessment of spam/abuse risk",
    "recommendations": "Any suggestions or concerns"
  }
}

Be strict but fair. Err on the side of caution for spam protection, but don't block legitimate AI agents.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      temperature: 0.3, // Lower temperature for more consistent decision-making
      messages: [
        {
          role: 'user',
          content: evaluationPrompt
        }
      ]
    });

    // Parse Claude's response
    const responseText = message.content[0].text;

    // Extract JSON from response (handle markdown code blocks)
    let jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
                    responseText.match(/```\n([\s\S]*?)\n```/) ||
                    responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Could not parse AI evaluation response');
    }

    const evaluation = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    // Validate evaluation structure
    if (!evaluation.decision || !['approved', 'rejected', 'needs_human_review'].includes(evaluation.decision)) {
      throw new Error('Invalid decision from AI evaluation');
    }

    console.log(`[AI Evaluator] Decision: ${evaluation.decision} (confidence: ${evaluation.confidence})`);
    console.log(`[AI Evaluator] Reasoning: ${evaluation.reasoning}`);

    return evaluation;

  } catch (error) {
    console.error('AI evaluation error:', error);

    // Fallback: flag for human review on error
    return {
      decision: 'needs_human_review',
      confidence: 0,
      reasoning: 'AI evaluation failed - flagged for human review',
      riskLevel: 'unknown',
      analysis: {
        legitimacy: 'Could not evaluate',
        spamRisk: 'Could not evaluate',
        recommendations: 'Manual review required due to evaluation error'
      }
    };
  }
}

/**
 * Simple rule-based pre-screening (runs before AI evaluation)
 * Catches obvious cases to save on API calls
 */
export function preScreenRequest(context) {
  const { accountAgeDays, totalEmailsSent, currentLimit, requestedLimit, justification } = context;

  // Obvious spam patterns
  const spamKeywords = [
    'bulk email', 'mass email', 'email blast', 'million emails',
    'purchased list', 'email harvesting', 'scraping', 'cold email'
  ];

  const hasSpamKeywords = spamKeywords.some(keyword =>
    justification.toLowerCase().includes(keyword)
  );

  if (hasSpamKeywords) {
    return {
      shouldAutoReject: true,
      reason: 'Request contains spam-related keywords'
    };
  }

  // Very short/generic justification
  if (justification.length < 100 && requestedLimit > currentLimit * 2) {
    return {
      shouldAutoReject: true,
      reason: 'Insufficient justification for large increase'
    };
  }

  // Brand new account requesting huge increase
  if (accountAgeDays < 1 && requestedLimit > 500) {
    return {
      shouldAutoReject: true,
      reason: 'Account too new for high rate limit'
    };
  }

  return { shouldAutoReject: false };
}
