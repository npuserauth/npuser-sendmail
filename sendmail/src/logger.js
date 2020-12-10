const {
  createLogger,
  format,
  transports
} = require('winston')

const { printf } = format

let level, silent
switch (process.env.NODE_ENV) {
  case 'production':
    level = 'info'
    silent = false
    break
  case 'test':
    level = 'emerg'
    silent = true
    break
  default:
    level = 'debug'
    silent = false
    break
}

const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`
})

const logTransports = [
  new transports.File({
    level: 'error',
    filename: './logs/error.log',
    format: format.json({
      replacer: (key, value) => {
        if (key === 'error') {
          return {
            message: value.message,
            stack: value.stack
          }
        }
        return value
      }
    })
  }),
  new transports.Console({
    level: level,
    silent,
    format: myFormat
    // format: format.simple()
  })
]

const logger = createLogger({
  format: format.combine(
    format.timestamp()
  ),
  transports: logTransports,
  defaultMeta: { service: 'api' }
})

logger.log({ level: 'info', message: `Logging level: ${level} silent: ${silent}` })

module.exports =logger
