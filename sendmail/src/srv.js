const http = require('http')
const urlParser = require('url')
const { writeResponse, do404, doError } = require('./srv-utils')
const { sendMailMiddleware } = require('./email')
const logger = require('./logger')

const { HOST_NAME } = process.env // this service's host name
const { SERVER_PORT } = process.env // the port this service listens on

if (!HOST_NAME || ! SERVER_PORT) {
  console.error('Must provide host name and server port in the environment')
  process.exit(1)
}

const BANNER = `npuser-sendmail server running at http://${HOST_NAME}:${SERVER_PORT}/`
function requestListener (req, res, body) {
  const { method, url } = req;
  const pathname = urlParser.parse(url, true).pathname
  let handled = false
  switch (method) {
    case 'GET':
      switch (pathname) {
        case '/':
          writeResponse(res, 200, BANNER)
          handled = true
          break
      }
      break
    case 'POST':
      switch (pathname) {
        case '/sendmail':
          sendMailMiddleware(req, res, body)
          handled = true
          break
      }
      break
  }
  if (!handled) {
    do404(req, res)
  }
}

/* ************** HTTP SERVER **************** */


http.createServer((request, response) => {
  let body = [];
  request.on('error', (err) => {
    logger.warn('npuser-sendmail Unexpected error ' + err.message)
    doError(response,500, err.message)
  }).on('data', (chunk) => {
    body.push(chunk);
  }).on('end', () => {
    body = Buffer.concat(body).toString();
    // At this point, we have the headers, method, url and body, and can now
    // do whatever we need to in order to respond to this request.
    requestListener(request, response, body)
  });
}).listen(SERVER_PORT, HOST_NAME, () => {
  logger.info(BANNER)
})
