import type { AxiosRequestConfig, AxiosResponse } from 'axios'

function colorize(msg: string, color: string) {
  // Only color in browser console
  return [`%c${msg}`, `color: ${color}; font-weight: bold;`]
}

export function logRequest(config: AxiosRequestConfig) {
  const [msg, style] = colorize(
    `[API REQUEST] ${config.method?.toUpperCase()} ${config.url}`,
    '#1976d2'
  )
  // eslint-disable-next-line no-console
  console.log(msg, style, config)
}

export function logResponse(response: AxiosResponse) {
  const [msg, style] = colorize(
    `[API RESPONSE] ${response.status} ${response.config.url}`,
    '#43a047'
  )
  // eslint-disable-next-line no-console
  console.log(msg, style, response)
}

export function logError(context: string, error: any) {
  const [msg, style] = colorize(
    `[API ERROR] ${context}: ${error?.message || error}`,
    '#e53935'
  )
  // eslint-disable-next-line no-console
  console.error(msg, style, error)
} 


