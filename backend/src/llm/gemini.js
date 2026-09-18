// Google Gemini adapter using @google/genai

const { GoogleGenAI } = require('@google/genai');

function toGeminiTools(tools) {
  if (!tools || tools.length === 0) return undefined;
  return [{
    functionDeclarations: tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.input_schema || { type: 'OBJECT', properties: {} },
    })),
  }];
}

function toGeminiContent(messages) {
  return messages.map(m => {
    let parts = [];
    if (typeof m.content === 'string') {
      parts.push({ text: m.content });
    } else if (Array.isArray(m.content)) {
      parts = m.content.map(p => {
        if (p?.type === 'image' && p.data) {
          return { inlineData: { mimeType: p.mime || 'image/jpeg', data: p.data } };
        }
        return { text: String(p?.text ?? '') };
      });
    }
    
    // Gemini roles: 'user' or 'model'
    let role = m.role === 'assistant' ? 'model' : m.role;
    // Map tool_call and tool response
    if (m.role === 'tool') {
      role = 'user';
      parts = [{
        functionResponse: {
          name: m.tool_type || m.tool_call_id, // We need the name, but m doesn't always have it easily. 
          response: { result: m.content }
        }
      }];
    }
    // Handle assistant tool_calls (this gets tricky to map exactly in generic format, 
    // but we can try our best or just rely on text).
    if (m.tool_calls) {
      role = 'model';
      parts = m.tool_calls.map(tc => ({
        functionCall: {
          name: tc.function?.name,
          args: JSON.parse(tc.function?.arguments || '{}')
        }
      }));
    }

    return { role, parts };
  });
}

async function runWithTools({
  systemPrompt,
  messages,
  tools,
  onToolCall,
  onStep,
  model,
  apiKey,
  maxIterations,
}) {
  const ai = new GoogleGenAI({ apiKey });
  const geminiTools = toGeminiTools(tools);
  
  const history = toGeminiContent(messages);
  
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let finalText = '';
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations += 1;
    const t0 = Date.now();
    
    const config = {
      tools: geminiTools,
    };
    if (systemPrompt) {
      config.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const resp = await ai.models.generateContent({
      model: model || 'gemini-2.5-flash',
      contents: history,
      config,
    });
    
    const latency = Date.now() - t0;
    
    const usage = resp.usageMetadata;
    totalInputTokens += usage?.promptTokenCount || 0;
    totalOutputTokens += usage?.candidatesTokenCount || 0;

    const candidate = resp.candidates?.[0];
    const finishReason = candidate?.finishReason;
    
    // Extract text
    const textPart = candidate?.content?.parts?.find(p => p.text);
    if (textPart) finalText = textPart.text.trim();
    
    // Extract tool calls
    const functionCalls = candidate?.content?.parts?.filter(p => p.functionCall) || [];

    await onStep({
      step_type: 'llm_call',
      status: 'ok',
      latency_ms: latency,
      input: { model, message_count: history.length, tool_count: tools?.length || 0 },
      output: {
        finish_reason: finishReason,
        prompt_tokens: usage?.promptTokenCount,
        completion_tokens: usage?.candidatesTokenCount,
      },
    });

    if (candidate?.content) {
      history.push(candidate.content);
    } else if (textPart) {
      history.push({ role: 'model', parts: [{ text: finalText }] });
    }

    if (functionCalls.length === 0) {
      return { finalText, totalInputTokens, totalOutputTokens, iterations };
    }

    for (const fcPart of functionCalls) {
      const fc = fcPart.functionCall;
      const name = fc.name;
      const args = fc.args || {};
      
      const tt0 = Date.now();
      let resultText;
      let stepStatus = 'ok';
      let stepError = null;
      try {
        const r = await onToolCall({ name, args });
        resultText = typeof r === 'string' ? r : JSON.stringify(r);
      } catch (err) {
        stepStatus = 'error';
        stepError = err.message;
        resultText = `Error: ${err.message}`;
      }
      
      await onStep({
        step_type: 'tool_call',
        tool_type: name,
        status: stepStatus,
        latency_ms: Date.now() - tt0,
        input: args,
        output: stepStatus === 'ok' ? safeParse(resultText) : null,
        error_message: stepError,
      });
      
      history.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name,
            response: { result: resultText }
          }
        }]
      });
    }
  }

  return { finalText, totalInputTokens, totalOutputTokens, iterations, capped: true };
}

function safeParse(s) {
  if (typeof s !== 'string') return s;
  try { return JSON.parse(s); } catch { return { text: s.slice(0, 500) }; }
}

module.exports = { runWithTools };
