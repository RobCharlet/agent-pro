import { runLLM } from '../../src/llm'
import { dadJokeToolDefinition } from '../../src/tools/dadJoke'
import { generateImageToolDefinition } from '../../src/tools/generateImage'
import { redditToolDefinition } from '../../src/tools/reddit'
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

const allTools = [
  dadJokeToolDefinition, 
  redditToolDefinition, 
  generateImageToolDefinition
]

runEval('all_tools', {
  task: (input) => runLLM({
    messages: [{role: 'user', content: input }],
    tools: allTools
  }),
  data: [
    {
      input: 'find me something interesting on reddit', 
      expected: createToolCallMessage(redditToolDefinition.name)
    },
    {
      input: 'tell me a funny dad joke', 
      expected: createToolCallMessage(dadJokeToolDefinition.name)
    },
    {
      input: 'generate an image of a cat', 
      expected: createToolCallMessage(generateImageToolDefinition.name)
    },
  ],
  scorers: [ToolCallMatch]
})
