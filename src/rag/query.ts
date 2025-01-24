import { Index as UpstashIndex } from '@upstash/vector'

// Will automatically use the Upstash environment variables
const index = new UpstashIndex()

// If we create an index specific to a user, we can use the namespace
//index.namespace('userId')

export const queryMovies = async ({
  query,
  filters,
  topK = 5,
}: {
  query: string,
  filters?: any,
  topK?: number,
}) => {
  return await index.query({
    data: query,
    topK: topK,
    includeData: true,
    includeMetadata: true,
  })
}
