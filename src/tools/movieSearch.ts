import type { ToolFn } from '../../types'
import { z } from 'zod'
import { queryMovies } from '../rag/query'

export const movieSearchToolDefinition = {
  name: 'movieSearch',
  parameters: z.object({
    // Let AI know that it could add a parameter query to the tool call
    // ex: "arguments": "{\"query\":\"vampire\"}"
    query: z.string().describe('query used to vector search on movies')  
  }),
  description: 'use this tool to find movies or answer questions about movies and their metadata like score, rating, costs, director, actors and more.'
}

type Args = z.infer<typeof movieSearchToolDefinition.parameters>

export const movieSearch: ToolFn<Args> = async ({ 
  userMessage, 
  toolArgs 
}) => {
  let results
  // We don't want agent to die
  try {
    results = await queryMovies({query: toolArgs.query})
  } catch (error) {
    console.error(error)
    // Let AI know that we couldn't get the movies
    return 'Error: Cound not query the db to get movies.'
  }

  const formattedResults = results.map((result) => {
    const {data, metadata} = result
    return {...metadata, description: data }
  })

  return JSON.stringify(formattedResults, null, 2)
}
