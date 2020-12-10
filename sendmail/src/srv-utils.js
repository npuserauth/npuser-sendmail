/* ************** HTTP HELPERS **************** */
const urlParser = require('url')

function writeResponse(res, status, object) {
  res.setHeader('Content-Type', 'application/json')
  res.writeHead(status)
  const text = JSON.stringify(object)
  res.end(text + '\n')
}

function doSuccess(res, message) {
  writeResponse(res, 200, {success: message})
}

function doError(res, status, message) {
  writeResponse(res, status, {error: message})
}

function do404(req, res) {
  const queryObject = urlParser.parse(req.url, true)
  const method = req.method
  const path = queryObject.pathname
  doError(res, 404, 'Resource not found')
}

exports.doError = doError
exports.do404 = do404
exports.doSuccess = doSuccess
exports.writeResponse = writeResponse
