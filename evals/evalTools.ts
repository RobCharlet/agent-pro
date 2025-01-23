import 'dotenv/config'
import type { Score, Scorer } from 'autoevals'
import chalk from 'chalk'
import { JSONFilePreset } from 'lowdb/node'

// Database interface types
type Run = {
  input: any
  output: any
  expected: any
  scores: {
    name: Score['name']
    score: Score['score']
  }[]
  createdAt?: string
}

type Set = {
  runs: Run[]
  score: number
  createdAt: string
}

type Experiment = {
  name: string
  sets: Set[]
}

type Data = {
  experiments: Experiment[]
}

// Default empty database structure
const defaultData: Data = {
  experiments: [],
}

// Initialize or load the JSON database
const getDb = async () => {
  const db = await JSONFilePreset<Data>('results.json', defaultData)
  return db
}

// Calculate average score across all runs and their individual scores
const calculateAvgScore = (runs: Run[]) => {
  const totalScores = runs.reduce((sum, run) => {
    const runAvg =
      run.scores.reduce((sum, score) => sum + score.score, 0) /
      run.scores.length
    return sum + runAvg
  }, 0)
  return totalScores / runs.length
}

// Retrieve an experiment by name from the database
export const loadExperiment = async (
  experimentName: string
): Promise<Experiment | undefined> => {
  const db = await getDb()
  return db.data.experiments.find((e) => e.name === experimentName)
}

// Save a new set of runs to an experiment
export const saveSet = async (
  experimentName: string,
  runs: Omit<Run, 'createdAt'>[]
) => {
  const db = await getDb()

  // Add timestamps to runs
  const runsWithTimestamp = runs.map((run) => ({
    ...run,
    createdAt: new Date().toISOString(),
  }))

  // Create new set with calculated score
  const newSet = {
    runs: runsWithTimestamp,
    score: calculateAvgScore(runsWithTimestamp),
    createdAt: new Date().toISOString(),
  }

  // Add to existing experiment or create new one
  const existingExperiment = db.data.experiments.find(
    (e) => e.name === experimentName
  )

  if (existingExperiment) {
    existingExperiment.sets.push(newSet)
  } else {
    db.data.experiments.push({
      name: experimentName,
      sets: [newSet],
    })
  }

  await db.write()
}

// Main evaluation function that runs tasks and compares results
export const runEval = async <T = any>(
  experiment: string,
  {
    task,
    data,
    scorers,
  }: {
    task: (input: any) => Promise<T>
    data: { input: any; expected?: T; reference?: string | string[] }[]
    scorers: Scorer<T, any>[]
  }
) => {
  // Execute all tasks and collect results
  const results = await Promise.all(
    data.map(async ({ input, expected, reference }) => {
      const results = await task(input)
      let context: string | string[]
      let output: string

      // Handle different result formats
      if (results.context) {
        context = results.context
        output = results.response
      } else {
        output = results
      }

      // Calculate scores using provided scorers
      const scores = await Promise.all(
        scorers.map(async (scorer) => {
          const score = await scorer({
            input,
            output: results,
            expected,
            reference,
            context,
          })
          return {
            name: score.name,
            score: score.score,
          }
        })
      )

      return { input, output, expected, scores }
    })
  )

  // Compare with previous results and display progress
  const previousExperiment = await loadExperiment(experiment)
  const previousScore =
    previousExperiment?.sets[previousExperiment.sets.length - 1]?.score || 0
  const currentScore = calculateAvgScore(results)
  const scoreDiff = currentScore - previousScore

  // Color-code output based on score difference
  const color = previousExperiment
    ? scoreDiff > 0
      ? chalk.green
      : scoreDiff < 0
      ? chalk.red
      : chalk.blue
    : chalk.blue

  // Display results
  console.log(`Experiment: ${experiment}`)
  console.log(`Previous score: ${color(previousScore.toFixed(2))}`)
  console.log(`Current score: ${color(currentScore.toFixed(2))}`)
  console.log(
    `Difference: ${scoreDiff > 0 ? '+' : ''}${color(scoreDiff.toFixed(2))}`
  )
  console.log()

  await saveSet(experiment, results)

  return results
}
