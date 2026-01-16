-- Seed extendido de categorías para ZIII Helpdesk
-- Ejecutar en Supabase SQL Editor después de seed.sql
-- Amplía el catálogo de incidencias para cubrir escenarios empresariales completos

-- ============================================================================
-- NUEVAS CATEGORÍAS NIVEL 1
-- ============================================================================

with
telefonia as (
  insert into categories (name, slug, parent_id, sort_order)
  values ('Telefonía / Comunicaciones', 'telefonia-comunicaciones', null, 50)
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
),
seguridad as (
  insert into categories (name, slug, parent_id, sort_order)
  values ('Seguridad', 'seguridad', null, 60)
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
),
servicios_nube as (
  insert into categories (name, slug, parent_id, sort_order)
  values ('Servicios en la Nube', 'servicios-nube', null, 70)
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
),
movil as (
  insert into categories (name, slug, parent_id, sort_order)
  values ('Dispositivos Móviles', 'dispositivos-moviles', null, 80)
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
),
desarrollo as (
  insert into categories (name, slug, parent_id, sort_order)
  values ('Desarrollo / Infraestructura', 'desarrollo-infra', null, 90)
  on conflict (parent_id, name) do update set slug = excluded.slug
  returning id
)
select 1;

-- ============================================================================
-- HARDWARE - Ampliar categorías existentes
-- ============================================================================

with hardware as (select id from categories where parent_id is null and name = 'Hardware' limit 1)
insert into categories (name, slug, parent_id, sort_order)
select 'Servidores / Datacenter', 'servidores-datacenter', hardware.id, 40 from hardware
on conflict (parent_id, name) do update set slug = excluded.slug;

with hardware as (select id from categories where parent_id is null and name = 'Hardware' limit 1)
insert into categories (name, slug, parent_id, sort_order)
select 'Equipos especializados', 'equipos-especializados', hardware.id, 50 from hardware
on conflict (parent_id, name) do update set slug = excluded.slug;

-- Subcategorías de Servidores
insert into categories (name, parent_id, sort_order)
select v.name, s.id, v.sort_order
from (values
  ('Servidor físico (fallo hardware)', 10),
  ('Servidor reinicia / cuelga', 20),
  ('Almacenamiento (RAID/SAN/NAS)', 30),
  ('Cableado estructurado', 40),
  ('UPS / energía / climatización', 50)
) v(name, sort_order)
cross join (select id from categories where name = 'Servidores / Datacenter' limit 1) s
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías de Equipos especializados
insert into categories (name, parent_id, sort_order)
select v.name, e.id, v.sort_order
from (values
  ('POS / terminal de punto de venta', 10),
  ('Lector de código de barras', 20),
  ('Tableta gráfica / Wacom', 30),
  ('Proyector / video conferencia', 40),
  ('Cámara IP / seguridad', 50)
) v(name, sort_order)
cross join (select id from categories where name = 'Equipos especializados' limit 1) e
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- ============================================================================
-- SOFTWARE - Ampliar categorías existentes
-- ============================================================================

with software as (select id from categories where parent_id is null and name = 'Software' limit 1)
insert into categories (name, slug, parent_id, sort_order)
select 'Bases de Datos', 'bases-datos', software.id, 50 from software
on conflict (parent_id, name) do update set slug = excluded.slug;

with software as (select id from categories where parent_id is null and name = 'Software' limit 1)
insert into categories (name, slug, parent_id, sort_order)
select 'Virtualización', 'virtualizacion', software.id, 60 from software
on conflict (parent_id, name) do update set slug = excluded.slug;

with software as (select id from categories where parent_id is null and name = 'Software' limit 1)
insert into categories (name, slug, parent_id, sort_order)
select 'Backup / Recuperación', 'backup-recuperacion', software.id, 70 from software
on conflict (parent_id, name) do update set slug = excluded.slug;

-- Subcategorías de Bases de Datos
insert into categories (name, parent_id, sort_order)
select v.name, bd.id, v.sort_order
from (values
  ('SQL Server (conexión/rendimiento)', 10),
  ('MySQL / PostgreSQL', 20),
  ('Oracle', 30),
  ('Replicación / sincronización', 40),
  ('Respaldo de BD', 50)
) v(name, sort_order)
cross join (select id from categories where name = 'Bases de Datos' limit 1) bd
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías de Virtualización
insert into categories (name, parent_id, sort_order)
select v.name, virt.id, v.sort_order
from (values
  ('VMware (ESXi/vCenter)', 10),
  ('Hyper-V', 20),
  ('Citrix / VDI', 30),
  ('Contenedores (Docker/K8s)', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'Virtualización' limit 1) virt
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías de Backup
insert into categories (name, parent_id, sort_order)
select v.name, bk.id, v.sort_order
from (values
  ('Backup falla / no se ejecuta', 10),
  ('Restauración de archivos', 20),
  ('Espacio insuficiente en backup', 30),
  ('Snapshot / imagen del sistema', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'Backup / Recuperación' limit 1) bk
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- ============================================================================
-- TELEFONÍA / COMUNICACIONES
-- ============================================================================

with telefonia as (select id from categories where parent_id is null and name = 'Telefonía / Comunicaciones' limit 1)
insert into categories (name, slug, parent_id, sort_order)
select v.name, v.slug, telefonia.id, v.sort_order from (values
  ('Central telefónica (PBX)', 'central-pbx', 10),
  ('Extensiones / líneas', 'extensiones-lineas', 20),
  ('Softphone / App móvil', 'softphone-app', 30),
  ('Videollamadas', 'videollamadas', 40)
) v(name, slug, sort_order)
cross join telefonia
on conflict (parent_id, name) do update set slug = excluded.slug;

-- Subcategorías Central PBX
insert into categories (name, parent_id, sort_order)
select v.name, c.id, v.sort_order
from (values
  ('No hay línea / tono', 10),
  ('No entran/salen llamadas', 20),
  ('Audio entrecortado / eco', 30),
  ('Configuración IVR / buzón de voz', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'Central telefónica (PBX)' limit 1) c
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías Extensiones
insert into categories (name, parent_id, sort_order)
select v.name, e.id, v.sort_order
from (values
  ('Alta de extensión', 10),
  ('Baja de extensión', 20),
  ('Cambio de número / puesto', 30),
  ('Desvío de llamadas', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'Extensiones / líneas' limit 1) e
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías Softphone
insert into categories (name, parent_id, sort_order)
select v.name, s.id, v.sort_order
from (values
  ('No registra / desconecta', 10),
  ('Configuración credenciales SIP', 20),
  ('Micrófono / auriculares', 30)
) v(name, sort_order)
cross join (select id from categories where name = 'Softphone / App móvil' limit 1) s
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías Videollamadas
insert into categories (name, parent_id, sort_order)
select v.name, v2.id, v.sort_order
from (values
  ('Teams / Zoom (audio/video)', 10),
  ('Compartir pantalla', 20),
  ('Sala de videoconferencia', 30),
  ('Grabación de reuniones', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'Videollamadas' limit 1) v2
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- ============================================================================
-- SEGURIDAD
-- ============================================================================

with seguridad as (select id from categories where parent_id is null and name = 'Seguridad' limit 1)
insert into categories (name, slug, parent_id, sort_order)
select v.name, v.slug, seguridad.id, v.sort_order from (values
  ('Antivirus / EDR', 'antivirus-edr', 10),
  ('Firewall / IPS', 'firewall-ips', 20),
  ('Phishing / Malware', 'phishing-malware', 30),
  ('Control de acceso físico', 'control-acceso-fisico', 40),
  ('Cumplimiento / Auditoría', 'cumplimiento-auditoria', 50)
) v(name, slug, sort_order)
cross join seguridad
on conflict (parent_id, name) do update set slug = excluded.slug;

-- Subcategorías Antivirus
insert into categories (name, parent_id, sort_order)
select v.name, av.id, v.sort_order
from (values
  ('Amenaza detectada / cuarentena', 10),
  ('No actualiza definiciones', 20),
  ('Desactivado / no protegido', 30),
  ('Falso positivo / exclusión', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'Antivirus / EDR' limit 1) av
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías Firewall
insert into categories (name, parent_id, sort_order)
select v.name, fw.id, v.sort_order
from (values
  ('Bloqueo de aplicación / puerto', 10),
  ('Regla de red', 20),
  ('VPN site-to-site', 30),
  ('IPS/IDS alertas', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'Firewall / IPS' limit 1) fw
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías Phishing
insert into categories (name, parent_id, sort_order)
select v.name, ph.id, v.sort_order
from (values
  ('Correo sospechoso / phishing', 10),
  ('Ransomware / archivo cifrado', 20),
  ('Cuenta comprometida', 30),
  ('Fuga de información', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'Phishing / Malware' limit 1) ph
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías Control físico
insert into categories (name, parent_id, sort_order)
select v.name, cf.id, v.sort_order
from (values
  ('Tarjeta de acceso (alta/baja)', 10),
  ('Cerradura electrónica', 20),
  ('Cámara de seguridad', 30),
  ('Registro de visitas', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'Control de acceso físico' limit 1) cf
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías Cumplimiento
insert into categories (name, parent_id, sort_order)
select v.name, cu.id, v.sort_order
from (values
  ('Logs / auditoría de accesos', 10),
  ('Certificación (ISO/SOC)', 20),
  ('DLP / prevención de pérdida', 30),
  ('GDPR / protección de datos', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'Cumplimiento / Auditoría' limit 1) cu
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- ============================================================================
-- SERVICIOS EN LA NUBE
-- ============================================================================

with servicios_nube as (select id from categories where parent_id is null and name = 'Servicios en la Nube' limit 1)
insert into categories (name, slug, parent_id, sort_order)
select v.name, v.slug, servicios_nube.id, v.sort_order from (values
  ('Microsoft 365', 'microsoft-365', 10),
  ('Google Workspace', 'google-workspace', 20),
  ('AWS / Azure / GCP', 'aws-azure-gcp', 30),
  ('SaaS empresarial', 'saas-empresarial', 40)
) v(name, slug, sort_order)
cross join servicios_nube
on conflict (parent_id, name) do update set slug = excluded.slug;

-- Subcategorías Microsoft 365
insert into categories (name, parent_id, sort_order)
select v.name, m365.id, v.sort_order
from (values
  ('Exchange Online (correo)', 10),
  ('Teams (chat/reuniones)', 20),
  ('SharePoint / OneDrive', 30),
  ('Power Platform (Apps/Automate)', 40),
  ('Licenciamiento M365', 50)
) v(name, sort_order)
cross join (select id from categories where name = 'Microsoft 365' limit 1) m365
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías Google Workspace
insert into categories (name, parent_id, sort_order)
select v.name, gw.id, v.sort_order
from (values
  ('Gmail empresarial', 10),
  ('Google Drive / Docs', 20),
  ('Google Meet', 30),
  ('Licencias Google Workspace', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'Google Workspace' limit 1) gw
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías Cloud providers
insert into categories (name, parent_id, sort_order)
select v.name, cp.id, v.sort_order
from (values
  ('Máquina virtual (VM/EC2)', 10),
  ('Almacenamiento (S3/Blob)', 20),
  ('Bases de datos en la nube', 30),
  ('Facturación / costos', 40),
  ('IAM / permisos cloud', 50)
) v(name, sort_order)
cross join (select id from categories where name = 'AWS / Azure / GCP' limit 1) cp
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías SaaS
insert into categories (name, parent_id, sort_order)
select v.name, saas.id, v.sort_order
from (values
  ('CRM (Salesforce/Dynamics)', 10),
  ('ERP (SAP/Oracle)', 20),
  ('HHRR / nómina', 30),
  ('Facturación electrónica', 40),
  ('BI / Analytics', 50)
) v(name, sort_order)
cross join (select id from categories where name = 'SaaS empresarial' limit 1) saas
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- ============================================================================
-- DISPOSITIVOS MÓVILES
-- ============================================================================

with movil as (select id from categories where parent_id is null and name = 'Dispositivos Móviles' limit 1)
insert into categories (name, slug, parent_id, sort_order)
select v.name, v.slug, movil.id, v.sort_order from (values
  ('Smartphones', 'smartphones', 10),
  ('Tablets', 'tablets', 20),
  ('MDM / Gestión móvil', 'mdm-gestion', 30),
  ('Apps móviles corporativas', 'apps-moviles-corp', 40)
) v(name, slug, sort_order)
cross join movil
on conflict (parent_id, name) do update set slug = excluded.slug;

-- Subcategorías Smartphones
insert into categories (name, parent_id, sort_order)
select v.name, sm.id, v.sort_order
from (values
  ('Configuración correo corporativo', 10),
  ('Batería / carga', 20),
  ('Actualización del sistema', 30),
  ('Sincronización de datos', 40),
  ('Robo / pérdida del dispositivo', 50)
) v(name, sort_order)
cross join (select id from categories where name = 'Smartphones' limit 1) sm
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías Tablets
insert into categories (name, parent_id, sort_order)
select v.name, tb.id, v.sort_order
from (values
  ('iPad corporativo', 10),
  ('Tablet Android / Windows', 20),
  ('Stylus / accesorios', 30)
) v(name, sort_order)
cross join (select id from categories where name = 'Tablets' limit 1) tb
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías MDM
insert into categories (name, parent_id, sort_order)
select v.name, mdm.id, v.sort_order
from (values
  ('Enrolamiento de dispositivo', 10),
  ('Políticas / restricciones', 20),
  ('Borrado remoto', 30),
  ('Intune / AirWatch / MobileIron', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'MDM / Gestión móvil' limit 1) mdm
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías Apps móviles
insert into categories (name, parent_id, sort_order)
select v.name, am.id, v.sort_order
from (values
  ('No instala / no abre app', 10),
  ('Error de autenticación', 20),
  ('Sincronización de app', 30)
) v(name, sort_order)
cross join (select id from categories where name = 'Apps móviles corporativas' limit 1) am
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- ============================================================================
-- DESARROLLO / INFRAESTRUCTURA
-- ============================================================================

with desarrollo as (select id from categories where parent_id is null and name = 'Desarrollo / Infraestructura' limit 1)
insert into categories (name, slug, parent_id, sort_order)
select v.name, v.slug, desarrollo.id, v.sort_order from (values
  ('Control de versiones', 'control-versiones', 10),
  ('CI/CD', 'ci-cd', 20),
  ('Servidores web', 'servidores-web', 30),
  ('Monitoreo / alertas', 'monitoreo-alertas', 40),
  ('DNS / Certificados SSL', 'dns-certificados', 50)
) v(name, slug, sort_order)
cross join desarrollo
on conflict (parent_id, name) do update set slug = excluded.slug;

-- Subcategorías Control versiones
insert into categories (name, parent_id, sort_order)
select v.name, cv.id, v.sort_order
from (values
  ('Git / GitHub / GitLab', 10),
  ('Permisos de repositorio', 20),
  ('Merge conflicts', 30),
  ('Branching / tagging', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'Control de versiones' limit 1) cv
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías CI/CD
insert into categories (name, parent_id, sort_order)
select v.name, ci.id, v.sort_order
from (values
  ('Pipeline falla / no ejecuta', 10),
  ('Jenkins / Azure DevOps', 20),
  ('Deploy automático', 30),
  ('Runners / agentes', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'CI/CD' limit 1) ci
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías Servidores web
insert into categories (name, parent_id, sort_order)
select v.name, sw.id, v.sort_order
from (values
  ('Apache / Nginx', 10),
  ('IIS', 20),
  ('Error 500 / 502 / 503', 30),
  ('Performance / optimización', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'Servidores web' limit 1) sw
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías Monitoreo
insert into categories (name, parent_id, sort_order)
select v.name, mon.id, v.sort_order
from (values
  ('Alerta de servicio caído', 10),
  ('Grafana / Prometheus', 20),
  ('Zabbix / Nagios', 30),
  ('Logs centralizados (ELK)', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'Monitoreo / alertas' limit 1) mon
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- Subcategorías DNS/SSL
insert into categories (name, parent_id, sort_order)
select v.name, dns.id, v.sort_order
from (values
  ('Registro DNS (A/CNAME/MX)', 10),
  ('Propagación / caché DNS', 20),
  ('Certificado SSL vencido', 30),
  ('Let''s Encrypt / renovación', 40)
) v(name, sort_order)
cross join (select id from categories where name = 'DNS / Certificados SSL' limit 1) dns
on conflict (parent_id, name) do update set sort_order = excluded.sort_order;

-- ============================================================================
-- COMENTARIOS FINALES
-- ============================================================================

COMMENT ON TABLE categories IS 'Catálogo extendido de categorías para incidencias de helpdesk empresarial - cubre Hardware, Software, Redes, Accesos, Telefonía, Seguridad, Cloud, Móviles y Desarrollo';
