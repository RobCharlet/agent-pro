import { runLLM } from '../../src/llm'
import { generateImageToolDefinition } from '../../src/tools/generateImage'
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

runEval('generate_image', {
  task: (input) => runLLM({
    messages: [{role: 'user', content: input }],
    tools: [generateImageToolDefinition]
  }),
  data: [
    {
      input: 'generate an image of a cat', 
      expected: createToolCallMessage(generateImageToolDefinition.name)
    },
    {
      input: 'take a photo of the sunset', 
      expected: createToolCallMessage(generateImageToolDefinition.name)
    },
    {
      input: 'draw a picture of a lama', 
      expected: createToolCallMessage(generateImageToolDefinition.name)
    },
  ],
  scorers: [ToolCallMatch]
})
