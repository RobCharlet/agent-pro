import { addMessages, getMessages, saveToolResponse } from './memory'
import { runLLM, approuvalCheck } from './llm'
import { showLoader, logMessage } from './ui'
import { runTool } from './toolRunner'
import type { AIMessage } from '../types'
import { generateImageToolDefinition } from './tools/generateImage'

const handleImageApprovalFlow = async (
  history: AIMessage[],
  userMessage: string
) => {
  const lastMessage = history.at(-1) // Same as history[history.length - 1]
  // Check if the last message is a tool call
  const toolCall = lastMessage?.tool_calls?.[0]

  // If the last message is not a tool call or the tool call is not the image generation tool, return false
  if (
    !toolCall || 
    toolCall.function.name !== generateImageToolDefinition.name
  ) {
    // Nothing need to be approved
    return false
  }

  const loader = showLoader('Processing approval...')
  const approved = await approuvalCheck(userMessage)
  
  if (approved) {
    loader.update(`executing tool ${toolCall.function.name}`)
    const toolResponse = await runTool(toolCall, userMessage)

    loader.update(`done: ${toolCall.function.name}`)
    await saveToolResponse(toolCall.id, toolResponse)
  } else {
    await saveToolResponse(
      toolCall.id, 
      'User did not approve image generation at this time.'
    )
  }

  loader.stop()
  return true
}

export const runAgent = async ({
  userMessage,
  tools,
}: {
  userMessage: string
  tools: any[]
}) => {
  const history = await getMessages()
  const isImageApprovalFlow = await handleImageApprovalFlow(history, userMessage)

  // Check if were are not in an image approval flow
  // (not that we refuse the approval)
  if (!isImageApprovalFlow) {
    // Normal flow, add the user message to history
    await addMessages([{ role: 'user', content: userMessage }])
  }

  const loader = showLoader('🤔')

  while (true) {
    const history = await getMessages()
    const response = await runLLM({ messages: history, tools })

    await addMessages([response])

    if (response.content) {
      loader.stop()
      logMessage(response)
      return getMessages()
    }

    if (response.tool_calls) {
      const toolCall = response.tool_calls[0]
      logMessage(response)
      loader.update(`executing: ${toolCall.function.name}`)

      if (toolCall.function.name === generateImageToolDefinition.name) {
        loader.update(`need user approval`)
        loader.stop()
        return getMessages()
      }

      const toolResponse = await runTool(toolCall, userMessage)
      await saveToolResponse(toolCall.id, toolResponse)
      loader.update(`done: ${toolCall.function.name}`)
    }
  }
}
