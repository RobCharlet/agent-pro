import type { Scorer } from 'autoevals'

export const ToolCallMatch: Scorer<any, { expected: string }> = async ({
  output,
  expected,
}) => {
  const score = 
  // When calling a tool, llm send a message with a role 'assistant' 
  output.role === 'assistant' &&
  // and a tool_calls array
  Array.isArray(output.tool_calls) &&
  // with a single tool call
  output.tool_calls.length === 1 &&
  // with the expected function name
  output.tool_calls[0].function?.name === expected.tool_calls[0].function?.name
  ? 1
  : 0

  return { 
    name: 'ToolCallMatch',
    score
  }
}
