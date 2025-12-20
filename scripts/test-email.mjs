/**
 * Script de prueba para verificar la configuración SMTP
 * Ejecutar con: node --env-file=.env.local scripts/test-email.mjs
 */

import nodemailer from 'nodemailer'

const config = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM,
  secure: process.env.SMTP_SECURE === 'true',
}

console.log('🔧 Configuración SMTP:')
console.log(`   Host: ${config.host}`)
console.log(`   Port: ${config.port}`)
console.log(`   Secure: ${config.secure}`)
console.log(`   User: ${config.user}`)
console.log(`   From: ${config.from}`)
console.log('')

if (!config.host || !config.user || !config.pass) {
  console.error('❌ Faltan variables de entorno SMTP')
  process.exit(1)
}

const transporter = nodemailer.createTransport({
  host: config.host,
  port: config.port,
  secure: config.secure,
  auth: {
    user: config.user,
    pass: config.pass,
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
const testEmail = process.argv[2] || config.user

console.log(`📨 Enviando email de prueba a: ${testEmail}`)

const mailOptions = {
  from: `${config.from} <${config.user}>`,
  to: testEmail,
  subject: 'Prueba de notificaciones - ZIII Helpdesk',
  text: 'Este es un correo de prueba del sistema de notificaciones del Helpdesk.',
  html: `
  <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#f9fafb; padding:24px;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding:20px;">
        <h1 style="margin:0; font-size:18px; color:#ffffff;">✅ Prueba de notificaciones</h1>
      </div>

      <div style="padding:20px;">
        <p style="margin:0 0 16px 0; font-size:14px; color:#374151; line-height:1.6;">
          Este es un correo de prueba del sistema de notificaciones del <strong>ZIII Helpdesk</strong>.
        </p>

        <div style="margin:20px 0; padding:16px; background:#f3f4f6; border-radius:8px; border-left:4px solid #4f46e5;">
          <p style="margin:0; font-size:13px; color:#111827; line-height:1.5;">
            <strong>✓</strong> Configuración SMTP correcta<br>
            <strong>✓</strong> Servidor: ${config.host}<br>
            <strong>✓</strong> Puerto: ${config.port}<br>
            <strong>✓</strong> Remitente: ${config.user}
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
