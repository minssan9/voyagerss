import { describe, expect, it } from 'vitest'
import { toCsv } from './api-airspace'

describe('toCsv', () => {
  it('quotes cells with commas, quotes and newlines and blanks nulls', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'say "hi"'], [null, 'two\nlines'], [1.5, undefined]])).toBe(
      'a,b\r\n"x,y","say ""hi"""\r\n,"two\nlines"\r\n1.5,\r\n',
    )
  })
})
