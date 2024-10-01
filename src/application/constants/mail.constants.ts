export const appMailSender = process.env.NODEMAIL_EMAIL
export const appMailPassword = process.env.NODEMAIL_PASS
export const appMailHost = process.env.NODEMAIL_HOST
export const appMailPort = Number(process.env.NODEMAIL_PORT)
export const appMailSSL = Boolean(process.env.NODEMAIL_SSL)
export const appFrontUpdatePasswordUri = process.env.APP_UPDATE_PASSWORD_URI

export const sendEmailsEnabled = (process.env?.SEND_EMAILS === 'true')