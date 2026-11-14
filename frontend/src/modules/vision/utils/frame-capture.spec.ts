import { describe, expect, it } from 'vitest'
import { fitSize, nextDelay, toScores, topScore } from './frame-capture'

describe('fitSize', () => {
  it('scales the long edge down to maxEdge', () => {
    expect(fitSize(1920, 1080, 640)).toEqual({ width: 640, height: 360 })
    expect(fitSize(1080, 1920, 640)).toEqual({ width: 360, height: 640 })
  })

  it('never upscales and handles empty sources', () => {
    expect(fitSize(320, 240, 640)).toEqual({ width: 320, height: 240 })
    expect(fitSize(0, 0, 640)).toEqual({ width: 0, height: 0 })
  })
})

describe('toScores / topScore', () => {
  it('turns a bool probability into yes/no', () => {
    const scores = toScores({ probability: 0.8 })
    expect(scores.yes).toBe(0.8)
    expect(scores.no).toBeCloseTo(0.2)
    expect(topScore(scores)).toEqual({ label: 'yes', value: 0.8 })
  })

  it('passes choice probabilities through', () => {
    const scores = toScores({ probabilities: { cat: 0.1, dog: 0.7, bird: 0.2 } })
    expect(topScore(scores)).toEqual({ label: 'dog', value: 0.7 })
    expect(topScore(toScores(null))).toBeNull()
  })
})

describe('nextDelay', () => {
  it('waits only the remaining part of the interval', () => {
    expect(nextDelay(1000, 300)).toBe(700)
    expect(nextDelay(1000, 1500)).toBe(0)
  })
})
