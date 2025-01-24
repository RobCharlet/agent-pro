import dotenv from 'dotenv'
import { Index as UpstashIndex } from '@upstash/vector'
import { parse } from 'csv-parse/sync'
import fs from 'fs'
import path from 'node:path'
import ora from 'ora'

dotenv.config()

// Setup upstash index
const index = new UpstashIndex({
  url: process.env.UPSTASH_VECTOR_REST_URL! as string,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN! as string,
})

// Read the movie data from the CSV file
const indexMovieData = async () => {
  const spinner = ora('Reading movie data...').start()
  // process.cwd() return the current working directory
  const moviesPath = path.join(process.cwd(), 'src/rag/imdb_movie_dataset.csv')
  const csvData = fs.readFileSync(moviesPath, 'utf8')
  const records = parse(csvData, { 
    columns: true,
    skip_empty_lines: true,
  })

  spinner.text = 'Starting movie indexing...'

  // Loop through each movie record and index it
  for (const movie of records) {
    spinner.text = `Indexing movie ${movie.Title}...`
    // What we want to index for user query to be compared with the vector
    const text = `${movie.Title}. ${movie.Genre}. ${movie.Description}.`
    
    try {
      await index.upsert([{ 
        id: movie.Title, // Using rank as unique id
        data: text, // text will be automatically embedded
        metadata: {
          title: movie.Title,
          year: Number(movie.Year),
          genre: movie.Genre,
          director: movie.Director,
          actors: movie.Actors,
          rating: Number(movie.Rating),
          votes: Number(movie.Votes),
          revenue: Number(movie.Revenue),
          metascore: Number(movie.Metascore),
        }
      }])
    } catch (error) {
      spinner.fail(`Error indexing movie ${movie.title}: ${error}`)
      console.error(error)
    }
  }

  spinner.succeed('Movie indexing complete')
}

indexMovieData()
