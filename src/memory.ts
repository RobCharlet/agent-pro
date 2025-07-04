import { JSONFilePreset } from 'lowdb/node'
import type { AIMessage } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { summarizeMessages } from './llm'
export type MessageWithMetadata = AIMessage & {
  id: string
  createdAt: string
}

type Data = {
  messages: MessageWithMetadata[]
  summary: string
}

export const addMetadata = (message: AIMessage) => {
  return {
    ...message,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  }
}

export const removeMetadata = (message: MessageWithMetadata) => {
  const { id, createdAt, ...rest } = message
  return rest
}

const defaultData: Data = {
  messages: [],
  summary: '',
}

export const getDb = async () => {
  const db = await JSONFilePreset<Data>('db.json', defaultData)
  return db
}

export const addMessages = async (messages: AIMessage[]) => {
  const db = await getDb()
  db.data.messages.push(...messages.map(addMetadata))

  // If we have more than 10 messages, we need to summarize the oldest 5 messages
  console.log(`db.data.messages.length: ${db.data.messages.length}`)
  if (db.data.messages.length >= 10) {
    const oldestMessage = db.data.messages.slice(0, 5).map(removeMetadata)
    const summary = await summarizeMessages(oldestMessage)
    db.data.summary = summary
  }

  await db.write()
}

// TODO: We always get the first 5 messages to resume the conversation
// We need to meake a cascade system.
export const getMessages = async () => {
  const db = await getDb()
  const messages = db.data.messages.map(removeMetadata)
  const lastFive = messages.slice(-5)

  // If the last message is a tool call, we need to add the message before
  // It will cause an error: you cant have a tool response response without 
  // a tool call with the same id
  if (lastFive[0].role === 'tool') {
    const sixthMessage = messages[messages.length - 6]
    return [sixthMessage, ...lastFive]
  }

  return lastFive
}

export const saveToolResponse = async (
  toolCallId: string,
  toolResponse: string
) => {
  return addMessages([
    {
      role: 'tool',
      content: toolResponse,
      tool_call_id: toolCallId,
    },
  ])
}

export const getSummary = async () => {
  const db = await getDb()
  
  return db.data.summary
}
