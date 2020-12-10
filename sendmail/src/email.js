/* ************** EMAIL **************** */
const nodemailer = require('nodemailer')
const { doSuccess, doError } = require('./srv-utils')
const logger = require('./logger')

function asBool(str, defaultVal) {
  return str ? str.toLowerCase() === 'true' : defaultVal
}
const ENABLE_SEND = asBool(process.env.ENABLE_SEND, true) // can disable send via env with ENABLE_SEND
const { MAIL_FROM } = process.env // email reply address. typically no-reply@npuser.org
const { MAIL_HOST_TYPE } = process.env // which email MTA to use? 'ethereal' or 'postfix'
const HostType = {
  ETHEREAL: 'ethereal',
  POSTFIX: 'postfix'
}

if (!MAIL_FROM || ! MAIL_HOST_TYPE) {
  console.error('Must provide MAIL_FROM and MAIL_HOST_TYPE in the environment')
  process.exit(1)
}

// lazy eval creation
let _transport = undefined

async function getConfig() {
  logger.debug('npuser-sendmail getConfig ')
  const cfg = {}
  switch (MAIL_HOST_TYPE) {
    case HostType.POSTFIX:
      cfg.host = 'postfix'
      cfg.port = 25
      break
    case HostType.ETHEREAL:
      const testAccount = await nodemailer.createTestAccount()
      logger.debug('npuser-sendmail getConfig testAccount', testAccount)
      cfg.host = 'smtp.ethereal.email'
      cfg.port = 587
      cfg.secure = false
      cfg.auth = {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass // generated ethereal password
      }
      break
  }
  return cfg
}

async function getTransport() {
  if( !_transport) {
    const nm_config = await getConfig()
    _transport = nodemailer.createTransport(nm_config)
  }
  return _transport
}

function validateMailQuery (mailQuery) {
  let result = undefined
  // very basic sanity checking only email regexp. This is not sufficient to validate all email addresses
  // but is sufficient to be sure the given email address has a hope in hell of working.
  const check = /[\w.%+-]+@[\w.-]+\.[\w]+/
  if (! mailQuery.toAddress ||  ! check.test(mailQuery.toAddress)) {
    result = 'Must provide valid email address in the query.'
  }
  else if ( ! mailQuery.subject) {
    result = 'Must provide subject for the email in the request query.'
  }
  else if ( ! mailQuery.textBody || ! mailQuery.htmlBody) {
    result = 'Must provide either a text or html body in the request query.'
  }
  return result
}

function composeMailOptions(mailQuery)
{
  return {
    from: MAIL_FROM,
    to: mailQuery.toAddress,
    subject: mailQuery.subject,
    text: mailQuery.textBody,
    html: mailQuery.htmlBody
  }

}

async function sendmail (mailOptions) {
  let transporter = await getTransport()
  return new Promise( (resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error)
        reject(error)
      else {
        logger.debug('npuser-sendmail info ' + JSON.stringify(info))
        if (MAIL_HOST_TYPE === HostType.ETHEREAL) {
          const infoUrl = nodemailer.getTestMessageUrl(info)
          logger.debug('npuser-sendmail Ethereal infoUrl: ' + JSON.stringify(infoUrl))
        }
        resolve(info)
      }
    })
  })
}

function sendMailMiddleware(req, res, body) {
  try {
    const mailQuery = body ? JSON.parse(body) : {}
    logger.debug('npuser-sendmail sendMailMiddleware mailQuery', mailQuery)
    const errMsg = validateMailQuery(mailQuery)
    if (errMsg) {
      const msg = 'npuser-sendmail request did not validate.' + errMsg
      logger.debug(msg)
      return doError(res, 400, msg)
    }
    if (ENABLE_SEND) {
      logger.debug('npuser-sendmail sendmail')
      const mailOptions = composeMailOptions(mailQuery)
      sendmail(mailOptions)
      .then((info) => {
        /*
        info includes the result, the exact format depends on the transport mechanism used
        info.messageId most transports should return the final Message-Id value used with this property
        info.envelope includes the envelope object for the message
        info.accepted is an array returned by SMTP transports (includes recipient addresses that were accepted by the server)
        info.rejected is an array returned by SMTP transports (includes recipient addresses that were rejected by the server)
        info.pending is an array returned by Direct SMTP transport. Includes recipient addresses that were temporarily rejected together with the server response
        response is a string returned by SMTP transports and includes the last SMTP response from the server
         */
        logger.debug('npuser-sendmail  response ' + JSON.stringify(info))
        doSuccess(res, 'Success send' + JSON.stringify(info))
      })
      .catch( (error) => {
        // handle the reject that may come from sendmail(opts)
        // empty the transport and recreate next time it is needed.
        // most likely error is connection refused
        const msg = 'npuser-sendmail UNEXPECTED SENDMAIL ERROR ' + error.message
        logger.error(msg)
        doError(res, 500, msg)
        // reset transport to empty to force lazy load. This may clear the cause of the error.
        _transport = undefined
      })
    } else {
      logger.debug('npuser-sendmail sending email is disabled')
      doSuccess(res, 'npuser-sendmail success. Send email disabled but have this email address: ' + mailQuery.toAddress)
    }
  } catch (error) {
    const msg = 'npuser-sendmail UNEXPECTED APPLICATION ERROR ' + error.message
    logger.error(msg)
    doError(res, 500, msg)
  }
}

exports.sendMailMiddleware = sendMailMiddleware
