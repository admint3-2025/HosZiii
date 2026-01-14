/**
 * Script de prueba para verificar la configuración SMTP
 * Ejecutar con: node scripts/test-email.mjs
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import nodemailer from 'nodemailer'

// Cargar variables de entorno desde .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM,
  secure: process.env.SMTP_SECURE === 'true',
}

console.log('🔧 Configuración SMTP:')
console.log(`   Host: ${smtpConfig.host}`)
console.log(`   Port: ${smtpConfig.port}`)
console.log(`   Secure: ${smtpConfig.secure}`)
console.log(`   User: ${smtpConfig.user}`)
console.log(`   From: ${smtpConfig.from}`)
console.log('')

if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
  console.error('❌ Faltan variables de entorno SMTP')
  process.exit(1)
}

const transporter = nodemailer.createTransport({
  host: smtpConfig.host,
  port: smtpConfig.port,
  secure: smtpConfig.secure,
  auth: {
    user: smtpConfig.user,
    pass: smtpConfig.pass,
  },
})

console.log('📧 Verificando conexión SMTP...')

try {
  await transporter.verify()
  console.log('✅ Conexión SMTP exitosa\n')
} catch (error) {
  console.error('❌ Error de conexión SMTP:', error.message)
  process.exit(1)
}

// Email de prueba
const testEmail = process.argv[2] || smtpConfig.user

console.log(`📨 Enviando email de prueba a: ${testEmail}`)

const mailOptions = {
  from: `${smtpConfig.from} <${smtpConfig.user}>`,
  to: testEmail,
  subject: 'Prueba de notificaciones - ZIII HoS',
  text: 'Este es un correo de prueba del sistema de notificaciones del Helpdesk.',
  html: `
  <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#f9fafb; padding:24px;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding:20px;">
        <h1 style="margin:0; font-size:18px; color:#ffffff;">✅ Prueba de notificaciones</h1>
      </div>

      <div style="padding:20px;">
        <p style="margin:0 0 16px 0; font-size:14px; color:#374151; line-height:1.6;">
          Este es un correo de prueba del sistema de notificaciones del <strong>ZIII HoS</strong>.
        </p>

        <div style="margin:20px 0; padding:16px; background:#f3f4f6; border-radius:8px; border-left:4px solid #4f46e5;">
          <p style="margin:0; font-size:13px; color:#111827; line-height:1.5;">
            <strong>✓</strong> Configuración SMTP correcta<br>
            <strong>✓</strong> Servidor: ${smtpConfig.host}<br>
            <strong>✓</strong> Puerto: ${smtpConfig.port}<br>
            <strong>✓</strong> Remitente: ${smtpConfig.user}
          </p>
        </div>

        <p style="margin:16px 0 0 0; font-size:13px; color:#6b7280; line-height:1.5;">
          Las notificaciones de tickets están listas para funcionar:
        </p>
        
        <ul style="margin:8px 0; padding-left:20px; font-size:13px; color:#374151; line-height:1.8;">
          <li>Creación de ticket</li>
          <li>Asignación a agente</li>
          <li>Cambios de estado</li>
          <li>Cierre de ticket</li>
        </ul>

        <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e5e7eb;">
          <p style="margin:0; font-size:12px; color:#6b7280;">
            Fecha de prueba: ${new Date().toLocaleString('es-MX', { 
              timeZone: 'America/Mexico_City',
              dateStyle: 'full',
              timeStyle: 'medium'
            })}
          </p>
        </div>
      </div>
    </div>

    <div style="max-width:560px; margin:12px auto 0 auto; font-size:11px; color:#9ca3af; text-align:center;">
      Este correo fue enviado automáticamente desde el sistema de pruebas.
    </div>
  </div>
  `,
}

try {
  const info = await transporter.sendMail(mailOptions)
  console.log('✅ Email enviado exitosamente')
  console.log(`   Message ID: ${info.messageId}`)
  console.log(`   Response: ${info.response}`)
  console.log('')
  console.log('🎉 ¡Sistema de correo funcionando correctamente!')
} catch (error) {
  console.error('❌ Error enviando email:', error.message)
  if (error.code) console.error(`   Código: ${error.code}`)
  if (error.command) console.error(`   Comando: ${error.command}`)
  process.exit(1)
}
