import { runLLM } from '../../src/llm'
import { dadJokeToolDefinition } from '../../src/tools/dadJoke'
import { runEval } from '../evalTools'
import { ToolCallMatch } from '../scorers'

// Create a LLM message type with a tool call
const createToolCallMessage = (toolName: string) => ({
  role: 'assistant',
  tool_calls: [{
    type: 'function',
    function: {
      name: toolName,
    }
  }]
})

runEval('dad_joke', {
  task: (input) => runLLM({
    messages: [{role: 'user', content: input }],
    tools: [dadJokeToolDefinition]
  }),
  data: [
    {
      input: 'tell me a funny dad joke', 
      expected: createToolCallMessage(dadJokeToolDefinition.name)
    },
  ],
  scorers: [ToolCallMatch]
})
