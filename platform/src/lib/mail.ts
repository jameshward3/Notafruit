/**
 * Mail transport adapter.
 *  - MAIL_TRANSPORT=smtp: real SMTP (production provider, or Mailpit locally via docker compose).
 *  - MAIL_TRANSPORT=capture (default in development): messages are written to a
 *    local JSONL file and NOT delivered. Outbox rows are marked "captured"-sent
 *    with a provider id prefixed "capture:" so nobody mistakes them for delivery.
 */
import { appendFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import nodemailer from 'nodemailer'

export type SendResult = { messageId: string; provider: 'smtp' | 'capture' }

export async function sendMail(m: { to: string; subject: string; text: string }): Promise<SendResult> {
  const from = process.env.MAIL_FROM ?? 'City of Orange Township <no-reply@localhost>'
  const mode = process.env.MAIL_TRANSPORT ?? 'capture'
  if (mode === 'smtp') {
    if (!process.env.SMTP_HOST) throw new Error('MAIL_TRANSPORT=smtp but SMTP_HOST is not set')
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
    const info = await t.sendMail({ from, ...m })
    if (!info.messageId || (info.rejected && info.rejected.length)) throw new Error(`Provider rejected message: ${JSON.stringify(info.rejected)}`)
    return { messageId: info.messageId, provider: 'smtp' }
  }
  const t = nodemailer.createTransport({ jsonTransport: true })
  const info = await t.sendMail({ from, ...m })
  const dir = process.env.MAIL_CAPTURE_DIR ?? 'private-uploads/mail-capture'
  await mkdir(dir, { recursive: true })
  await appendFile(path.join(dir, 'outbox.jsonl'), JSON.stringify({ at: new Date().toISOString(), ...m }) + '\n')
  return { messageId: `capture:${info.messageId}`, provider: 'capture' }
}
