export interface AutoPattern {
  match: RegExp | ((content: string, thinking?: string) => boolean)
  response: string
}

export interface AutoMatch {
  response: string
}

export function matchAutoPatterns(
  content: string,
  thinking: string | undefined,
  patterns: AutoPattern[],
): AutoMatch[] {
  const matches: AutoMatch[] = []

  for (const pattern of patterns) {
    let matched = false
    if (pattern.match instanceof RegExp) {
      matched = pattern.match.test(content) || (thinking !== undefined && pattern.match.test(thinking))
    } else {
      matched = pattern.match(content, thinking)
    }
    if (matched) {
      matches.push({ response: pattern.response })
    }
  }

  return matches
}
