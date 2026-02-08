-- =====================================================
-- LIMPIEZA: Eliminar notificaciones de inspecciones críticas 
-- para usuarios que NO son admin o corporate_admin
-- =====================================================
-- Fecha: 2026-02-08
-- Motivo: Las notificaciones de inspecciones críticas solo deben
--         llegar a roles admin y corporate_admin, no a agent_l1,
--         supervisor u otros roles.
-- =====================================================

-- 1. Ver cuántas notificaciones de inspección hay para roles NO corporativos
select 
  p.role,
  count(*) as notification_count
from notifications n
inner join profiles p on p.id = n.user_id
where n.type = 'inspection_critical'
  and p.role not in ('admin', 'corporate_admin')
group by p.role
order by notification_count desc;

-- 2. Eliminar notificaciones de inspecciones críticas para usuarios no corporativos
delete from notifications
where type = 'inspection_critical'
  and user_id in (
    select id 
    from profiles 
    where role not in ('admin', 'corporate_admin')
  );

-- 3. Verificar que solo quedan notificaciones para admin y corporate_admin
select 
  p.role,
  count(*) as notification_count
from notifications n
inner join profiles p on p.id = n.user_id
where n.type = 'inspection_critical'
group by p.role
order by p.role;
