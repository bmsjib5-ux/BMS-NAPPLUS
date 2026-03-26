// Workshop Dashboard Generator
// Generates HTML dashboard files for each workshop report
const fs = require('fs');
const path = require('path');

const workshops = [
  {
    id: 'admit',
    name: 'Admit',
    nameTh: 'ระบบงาน Admit',
    icon: '&#128719;',
    columns: [
      { key: 'officer_login_name', label: 'Login' },
      { key: 'officer_name', label: 'ชื่อ-นามสกุล' },
      { key: 'cc_admit', label: 'รับ Admit', type: 'num' },
      { key: 'cc_tranfer', label: 'Transfer', type: 'num' },
    ],
    sql: `SELECT o.officer_login_name, o.officer_name,
  COUNT(DISTINCT oal.officer_activity_log_key_value) AS cc_admit,
  COUNT(DISTINCT (CASE WHEN oit.an IS NOT NULL THEN oit.an END)) AS cc_tranfer
FROM officer_activity_log oal
LEFT JOIN officer o ON o.officer_login_name = oal.staff
LEFT JOIN opd_ipd_transfer oit ON oit.an = oal.officer_activity_log_key_value
WHERE oal.officer_activity_log_table = 'ipt'
  AND oal.officer_activity_log_datetime BETWEEN '{dateFrom}' AND '{dateTo}'
  AND officer_activity_log_operation = 'Add'
  AND o.officer_name NOT ILIKE '%bms%'
GROUP BY o.officer_login_name, o.officer_name
ORDER BY o.officer_login_name`
  },
  {
    id: 'blood-bank',
    name: 'Blood Bank',
    nameTh: 'ระบบงาน Blood Bank',
    icon: '&#129656;',
    columns: [
      { key: 'officer_login_name', label: 'Login' },
      { key: 'officer_name', label: 'ชื่อ-นามสกุล' },
      { key: 'cc_pt', label: 'จำนวนผู้ป่วย', type: 'num' },
      { key: 'cc_request', label: 'สั่ง Request', type: 'num' },
      { key: 'cc_receive', label: 'รับเลือด', type: 'num' },
      { key: 'cc_cross', label: 'Crossmatch', type: 'num' },
      { key: 'cc_pay', label: 'จ่ายเลือด', type: 'num' },
    ],
    sql: `SELECT * FROM (
  SELECT officer.officer_id, officer.officer_login_name, officer.officer_name,
    (SELECT COUNT(DISTINCT hn) FROM blb_request WHERE blb_request_order_date BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = officer.officer_login_name) AS cc_pt,
    (SELECT COUNT(DISTINCT blb_request_id) FROM blb_request WHERE blb_request_order_date BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = officer.officer_login_name) AS cc_request,
    (SELECT COUNT(DISTINCT blb_request_id) FROM blb_request WHERE blb_request_receive_date BETWEEN '{dateFrom}' AND '{dateTo}' AND blb_request_receive_staff = officer.officer_doctor_code) AS cc_receive,
    (SELECT COUNT(DISTINCT blb_pay_crossmatch_id) FROM blb_pay_crossmatch WHERE blb_pay_crossmatch_date BETWEEN '{dateFrom}' AND '{dateTo}' AND blb_pay_crossmatch_doctor = officer.officer_doctor_code) AS cc_cross,
    (SELECT COUNT(DISTINCT blb_pay_id) FROM blb_pay WHERE blb_pay_date BETWEEN '{dateFrom}' AND '{dateTo}' AND blb_pay_doctor = officer.officer_doctor_code) AS cc_pay
  FROM officer
  INNER JOIN officer_group_list ON officer.officer_id = officer_group_list.officer_id
  INNER JOIN officer_group ON officer_group.officer_group_id = officer_group_list.officer_group_id
  WHERE officer_group.officer_group_name IN ('User : Blood Bank')
  GROUP BY officer.officer_id, officer.officer_doctor_code, officer.officer_login_name, officer.officer_name
) AS cc
WHERE cc.cc_pt > 0 OR cc_request > 0 OR cc_receive > 0 OR cc_cross > 0 OR cc_pay > 0`
  },
  {
    id: 'ipd',
    name: 'IPD',
    nameTh: 'ระบบงาน IPD',
    icon: '&#128202;',
    columns: [
      { key: 'staff', label: 'Login' },
      { key: 'name', label: 'ชื่อ-นามสกุล' },
      { key: 'new_w', label: 'รับใหม่', type: 'num' },
      { key: 'move_w', label: 'ย้ายวอร์ด', type: 'num' },
      { key: 'dp_w', label: 'หัตถการ', type: 'num' },
      { key: 'ord_w', label: 'สั่ง Order', type: 'num' },
      { key: 'lab_w', label: 'สั่ง LAB', type: 'num' },
      { key: 'xray_w', label: 'X-Ray', type: 'num' },
      { key: 'oapp_w', label: 'นัด', type: 'num' },
      { key: 'bb_w', label: 'Blood Bank', type: 'num' },
      { key: 'dch_w', label: 'Discharge', type: 'num' },
    ],
    sql: `SELECT tt.staff, tt.name,
  count(distinct tt.new_ipt) as new_w, count(distinct tt.move_ipt) as move_w,
  count(distinct tt.dp_ipt) as dp_w, count(distinct tt.ord_ipt) as ord_w,
  count(distinct tt.lab_ipt) as lab_w, count(distinct tt.xray_ipt) as xray_w,
  count(distinct tt.oapp_ipt) as oapp_w, count(distinct tt.bb_ipt) as bb_w,
  count(distinct tt.dch_ipt) as dch_w
FROM (
  SELECT d.staff, u.officer_name as name,
    case when d.movereason = 'รับใหม่' then d.an end as new_ipt,
    case when d.movereason <> 'รับใหม่เข้าตึก' then d.an end as move_ipt,
    case when dp.ipt_oper_code is not null then dp.ipt_oper_code end as dp_ipt,
    case when ord.an is not null then ord.an end as ord_ipt,
    case when lh.form_name is not null then lh.vn end as lab_ipt,
    case when x.xn is not null then x.an end as xray_ipt,
    case when o.oapp_id is not null then o.oapp_id end as oapp_ipt,
    case when bb.blb_request_id is not null then bb.blb_request_id end as bb_ipt,
    case when ip.an is not null then ip.an end as dch_ipt
  FROM iptbedmove d
  LEFT JOIN officer u ON u.officer_login_name = d.staff
  LEFT JOIN ipt_nurse_oper dp ON dp.staff = d.staff AND dp.entry_datetime BETWEEN '{dateFrom}' AND '{dateTo}'
  LEFT JOIN nutrition_food_ord ord ON ord.staff = d.staff AND ord.last_update BETWEEN '{dateFrom}' AND '{dateTo}'
  LEFT JOIN lab_head lh ON lh.order_staff = d.staff AND lh.entry_datetime BETWEEN '{dateFrom}' AND '{dateTo}'
  LEFT JOIN xray_report x ON x.request_staff = d.staff AND x.order_datetime BETWEEN '{dateFrom}' AND '{dateTo}'
  LEFT JOIN oapp o ON o.app_user = d.staff AND o.update_datetime BETWEEN '{dateFrom}' AND '{dateTo}'
  LEFT JOIN blb_request bb ON bb.staff = d.staff AND bb.last_update BETWEEN '{dateFrom}' AND '{dateTo}'
  LEFT JOIN (SELECT i.an, l.staff FROM ipt i, officer_activity_log l
    WHERE i.an = l.officer_activity_log_key_value AND officer_activity_log_table = 'ipt'
    AND officer_activity_log_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND i.confirm_discharge = 'Y') ip ON ip.staff = d.staff
  WHERE d.entry_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND u.officer_name NOT LIKE '%BMS%'
) tt GROUP BY tt.staff, tt.name`
  },
  {
    id: 'xray',
    name: 'X-Ray',
    nameTh: 'ระบบงาน X-Ray',
    icon: '&#9832;',
    columns: [
      { key: 'loginname', label: 'Login' },
      { key: 'name', label: 'ชื่อ-นามสกุล' },
      { key: 'cc_pt', label: 'จำนวนผู้ป่วย', type: 'num' },
      { key: 'cc_order', label: 'สั่ง Order', type: 'num' },
      { key: 'cc_accept_report', label: 'บันทึกผล', type: 'num' },
    ],
    sql: `SELECT u.name, u.loginname,
  COUNT(DISTINCT x.vn) AS cc_pt,
  COUNT(r.xn) AS cc_order,
  (SELECT COUNT(DISTINCT officer_activity_log_key_value) FROM officer_activity_log
    WHERE staff = u.loginname AND officer_activity_log_table = 'xray_report'
    AND officer_activity_log_date BETWEEN '{dateFrom}' AND '{dateTo}') AS cc_accept_report
FROM xray_head x
LEFT JOIN xray_report r ON r.vn = x.vn
LEFT JOIN opduser u ON u.loginname = r.request_staff
WHERE x.order_date BETWEEN '{dateFrom}' AND '{dateTo}'
  AND UPPER(u.name) NOT LIKE '%BMS%'
GROUP BY u.name, u.loginname`
  },
  {
    id: 'pathology',
    name: 'Pathology',
    nameTh: 'ระบบงานชิ้นเนื้อ',
    icon: '&#128300;',
    columns: [
      { key: 'order_staff', label: 'Login' },
      { key: 'officer_name', label: 'ชื่อ-นามสกุล' },
      { key: 'cc_hn', label: 'จำนวน HN', type: 'num' },
      { key: 'cc_order', label: 'สั่ง Order', type: 'num' },
      { key: 'cc_receive', label: 'รับ Specimen', type: 'num' },
      { key: 'cc_report', label: 'รายงานผล', type: 'num' },
    ],
    sql: `SELECT h.order_staff, oc.officer_name,
  COUNT(DISTINCT h.hn) AS cc_hn,
  COUNT(h.lab_order_number) AS cc_order,
  COUNT(CASE WHEN h.lab_receive = 'Y' THEN h.lab_receive END) AS cc_receive,
  COUNT(CASE WHEN h.confirm_report = 'Y' THEN h.confirm_report END) AS cc_report
FROM lab_head h
LEFT JOIN officer oc ON oc.officer_login_name = h.order_staff
WHERE h.order_date BETWEEN '{dateFrom}' AND '{dateTo}'
  AND h.order_department IN('287','288','162')
  AND h.order_staff IS NOT NULL AND h.order_staff <> 'patho'
GROUP BY h.order_staff, oc.officer_name`
  },
  {
    id: 'finance',
    name: 'Finance',
    nameTh: 'ระบบงานการเงิน',
    icon: '&#128176;',
    columns: [
      { key: 'staff', label: 'Login' },
      { key: 'name', label: 'ชื่อ-นามสกุล' },
      { key: 'total_rc', label: 'จำนวน VN', type: 'num' },
      { key: 'print_rc', label: 'ออกใบเสร็จ', type: 'num' },
      { key: 'deb_rc', label: 'ใบหนี้', type: 'num' },
      { key: 'arear_rc', label: 'ค้างชำระ', type: 'num' },
      { key: 'deb_c_rc', label: 'ใบลดหนี้', type: 'num' },
      { key: 'prin_c_rc', label: 'ยกเลิกใบเสร็จ', type: 'num' },
    ],
    sql: `SELECT tt.staff, tt.name,
  COUNT(DISTINCT tt.one_rc) AS total_rc,
  COUNT(DISTINCT tt.prin_rc) AS print_rc,
  COUNT(DISTINCT tt.deb_rc) AS deb_rc,
  COUNT(DISTINCT tt.arear_rc) AS arear_rc,
  COUNT(DISTINCT tt.deb_c_rc) AS deb_c_rc,
  COUNT(DISTINCT tt.prin_c_rc) AS prin_c_rc
FROM (
  SELECT d.opd_opi_fn_tr_staff AS staff, u.name,
    CASE WHEN d.vn <> '' THEN d.vn END AS one_rc,
    CASE WHEN rp.vn <> '' THEN d.vn END AS prin_rc,
    CASE WHEN rb.vn <> '' THEN d.vn END AS deb_rc,
    CASE WHEN ra.vn <> '' THEN d.vn END AS arear_rc,
    CASE WHEN rpc.vn <> '' THEN d.vn END AS deb_c_rc,
    CASE WHEN rp.status = 'ABORT' THEN d.vn END AS prin_c_rc
  FROM opd_opi_fn_tr_list d
  LEFT JOIN opduser u ON u.loginname = d.opd_opi_fn_tr_staff
  LEFT JOIN rcpt_print rp ON d.vn = rp.vn
  LEFT JOIN rcpt_debt rb ON d.vn = rb.vn
  LEFT JOIN patient_arrear ra ON d.vn = ra.vn
  LEFT JOIN rcpt_debt_cancel rpc ON d.vn = rpc.vn
  WHERE CONCAT(d.opd_opi_fn_tr_date, ' ', d.opd_opi_fn_tr_time) BETWEEN '{dateFrom}' AND '{dateTo}'
    AND d.opd_opi_fn_tr_staff NOT IN (SELECT officer_login_name FROM officer WHERE officer_name ILIKE '%BMS%')
) tt GROUP BY tt.staff, tt.name`
  },
  {
    id: 'er',
    name: 'ER',
    nameTh: 'ระบบงานฉุกเฉิน ER',
    icon: '&#128680;',
    columns: [
      { key: 'staff', label: 'Login' },
      { key: 'officer_name', label: 'ชื่อ-นามสกุล' },
      { key: 'er', label: 'รับ ER', type: 'num' },
      { key: 'opdscreen_cc_list', label: 'บันทึก CC', type: 'num' },
      { key: 'opdscreen_bp', label: 'Vital Sign', type: 'num' },
      { key: 'doctor_operation', label: 'หัตถการ', type: 'num' },
      { key: 'lab_head', label: 'สั่ง LAB', type: 'num' },
      { key: 'xray_head', label: 'สั่ง X-Ray', type: 'num' },
      { key: 'opitemrece', label: 'สั่งยา', type: 'num' },
      { key: 'oapp', label: 'นัด', type: 'num' },
    ],
    sql: `SELECT f.staff, ff.officer_name,
  COUNT(DISTINCT CASE WHEN officer_activity_log_table = 'er_regist' THEN officer_activity_log_parent_kv END) AS er,
  COUNT(DISTINCT CASE WHEN officer_activity_log_table = 'opdscreen_cc_list' THEN officer_activity_log_parent_kv END) AS opdscreen_cc_list,
  COUNT(DISTINCT CASE WHEN officer_activity_log_table = 'opdscreen_bp' THEN officer_activity_log_parent_kv END) AS opdscreen_bp,
  COUNT(DISTINCT CASE WHEN officer_activity_log_table = 'doctor_operation' THEN officer_activity_log_parent_kv END) AS doctor_operation,
  COUNT(CASE WHEN officer_activity_log_table = 'lab_head' THEN officer_activity_log_parent_kv END) AS lab_head,
  COUNT(CASE WHEN officer_activity_log_table = 'xray_head' THEN officer_activity_log_parent_kv END) AS xray_head,
  COUNT(CASE WHEN officer_activity_log_table = 'opitemrece' THEN officer_activity_log_parent_kv END) AS opitemrece,
  COUNT(DISTINCT CASE WHEN officer_activity_log_table = 'oapp' THEN officer_activity_log_parent_kv END) AS oapp
FROM officer_activity_log f
LEFT JOIN officer ff ON ff.officer_login_name = f.staff
WHERE f.officer_activity_log_date::DATE BETWEEN '{dateFrom}' AND '{dateTo}'
  AND f.depcode IN (SELECT depcode FROM kskdepartment WHERE department LIKE '%ฉุกเฉิน%')
  AND officer_activity_log_operation = 'Add'
  AND f.staff NOT IN ('er')
  AND ff.officer_name NOT LIKE '%BMS%'
GROUP BY f.staff, ff.officer_name`
  },
  {
    id: 'screening',
    name: 'Screening',
    nameTh: 'ระบบงานซักประวัติ',
    icon: '&#128203;',
    columns: [
      { key: 'staff', label: 'Login' },
      { key: 'name', label: 'ชื่อ-นามสกุล' },
      { key: 'bp_o', label: 'Vital Sign', type: 'num' },
      { key: 'cc_o', label: 'CC', type: 'num' },
      { key: 'hpi_text', label: 'HPI', type: 'num' },
      { key: 'dp_o', label: 'หัตถการ', type: 'num' },
      { key: 'lab_o', label: 'สั่ง LAB', type: 'num' },
      { key: 'xray_o', label: 'สั่ง X-Ray', type: 'num' },
      { key: 'oapp_o', label: 'นัด', type: 'num' },
      { key: 'opi1_o', label: 'สั่งยา', type: 'num' },
      { key: 'opi3_o', label: 'เวชภัณฑ์', type: 'num' },
    ],
    sql: `SELECT tt.staff, tt.name,
  count(distinct tt.bp_accept) as bp_o, count(distinct tt.cc_accept) as cc_o,
  count(distinct tt.hpi_text) as hpi_text, count(distinct tt.dp_accept) as dp_o,
  count(distinct tt.lab_accept) as lab_o, count(distinct tt.xray_accept) as xray_o,
  count(distinct tt.oapp_accept) as oapp_o, count(distinct tt.opi_accept) as opi1_o,
  count(distinct tt.opi3_accept) as opi3_o
FROM (
  SELECT d.staff, u.name,
    case when op.cc <> '' then op.vn end as cc_accept,
    case when op.bpd is not null then op.vn end as bp_accept,
    case when hpi.hpi_text <> '' then hpi.vn end as hpi_text,
    case when lh.form_name is not null then lh.vn end as lab_accept,
    case when x.xray_order_number is not null then x.vn end as xray_accept,
    case when o.oapp_id is not null then o.oapp_id end as oapp_accept,
    case when opi.icode like '1%' then opi.icode end as opi_accept,
    case when opi.icode like '3%' then opi.icode end as opi3_accept,
    case when dp.er_oper_code is not null then dp.er_oper_code end as dp_accept
  FROM opdscreen_cc_list d
  LEFT JOIN opduser u ON u.loginname = d.staff
  LEFT JOIN opdscreen op ON d.vn = op.vn
  LEFT JOIN patient_history_hpi hpi ON hpi.vn = op.vn
  LEFT JOIN lab_head lh ON d.vn = lh.vn
  LEFT JOIN xray_head x ON d.vn = x.vn
  LEFT JOIN oapp o ON d.vn = o.vn
  LEFT JOIN opitemrece opi ON d.vn = opi.vn
  LEFT JOIN doctor_operation dp ON d.vn = dp.vn
  LEFT JOIN doctor dc ON u.doctorcode = dc.code
  WHERE d.update_datetime BETWEEN '{dateFrom}' AND '{dateTo}'
    AND u.name NOT LIKE '%BMS%' AND dc.position_id <> '1'
) tt GROUP BY tt.staff, tt.name`
  },
  {
    id: 'screening-bc',
    name: 'Registration',
    nameTh: 'ระบบงานซักประวัติ-bc (เวชระเบียน)',
    icon: '&#128221;',
    columns: [
      { key: 'staff', label: 'Login' },
      { key: 'officer_name', label: 'ชื่อ-นามสกุล' },
      { key: 'new_hn', label: 'HN ใหม่', type: 'num' },
      { key: 'pttype', label: 'สิทธิ์', type: 'num' },
      { key: 'new_visit', label: 'New Visit', type: 'num' },
      { key: 'new_visit_oapp', label: 'Visit+นัด', type: 'num' },
      { key: 'pttype_check', label: 'เช็คสิทธิ์', type: 'num' },
      { key: 'referin', label: 'Refer In', type: 'num' },
      { key: 'count_pttype', label: 'สิทธิ์ซ้ำ', type: 'num' },
    ],
    sql: `SELECT o.officer_login_name AS staff, o.officer_name,
  (SELECT count(distinct hn) FROM patient_log WHERE log_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = o.officer_login_name) AS new_hn,
  (SELECT count(distinct l.officer_activity_log_key_value) FROM officer_activity_log l WHERE officer_activity_log_table = 'patient_pttype' AND officer_activity_log_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = o.officer_login_name) AS pttype,
  (SELECT count(distinct vn) FROM ovst_service_time WHERE service_begin_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = o.officer_login_name AND ovst_service_time_type_code = 'OPD-NEW-VISIT') AS new_visit,
  (SELECT count(distinct oa.vn) FROM ovst_service_time ost JOIN oapp oa ON oa.visit_vn = ost.vn WHERE ost.service_begin_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND ost.staff = o.officer_login_name AND ost.ovst_service_time_type_code LIKE 'OPD-NEW-VISIT%') AS new_visit_oapp,
  (SELECT count(distinct anvn) FROM (SELECT an AS anvn FROM ipt_pttype_check WHERE pttype_check_staff = o.officer_login_name AND pttype_check_datetime BETWEEN '{dateFrom}' AND '{dateTo}' UNION SELECT vn AS anvn FROM ovst_seq WHERE pttype_check_staff = o.officer_login_name AND pttype_check_datetime BETWEEN '{dateFrom}' AND '{dateTo}') tmp) AS pttype_check,
  (SELECT count(distinct r.vn) FROM ovst_service_time ost JOIN referin r ON r.vn = ost.vn WHERE ost.service_begin_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND ost.staff = o.officer_login_name AND ost.ovst_service_time_type_code LIKE 'OPD-NEW-VISIT%') AS referin,
  (SELECT count(distinct vn) FROM (SELECT vn, count(*) FROM visit_pttype WHERE update_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = o.officer_login_name GROUP BY vn HAVING count(*) > 1) tmp) AS count_pttype
FROM officer o
INNER JOIN officer_group_list ogl ON o.officer_id = ogl.officer_id
INNER JOIN officer_group og ON ogl.officer_group_id = og.officer_group_id
WHERE og.officer_group_name ILIKE '%ซักประวัติ%'
  AND o.officer_active = 'Y'
GROUP BY o.officer_login_name, o.officer_name`
  },
  {
    id: 'checkup',
    name: 'Checkup',
    nameTh: 'ระบบงานตรวจสุขภาพ',
    icon: '&#129657;',
    columns: [
      { key: 'officer_login_name', label: 'Login' },
      { key: 'officer_name', label: 'ชื่อ-นามสกุล' },
      { key: 'count_pt', label: 'จำนวนผู้ป่วย', type: 'num' },
      { key: 'count_bp', label: 'Vital Sign', type: 'num' },
      { key: 'count_cc', label: 'CC', type: 'num' },
      { key: 'count_lab', label: 'สั่ง LAB', type: 'num' },
      { key: 'count_xray', label: 'สั่ง X-Ray', type: 'num' },
      { key: 'count_oapp', label: 'นัด', type: 'num' },
    ],
    sql: `SELECT o.officer_login_name, o.officer_name,
  COUNT(DISTINCT ov.patient_hn) AS count_pt,
  COUNT(DISTINCT (CASE WHEN op.bps IS NOT NULL THEN ov.vn END)) AS count_bp,
  COUNT(DISTINCT (CASE WHEN op.cc IS NOT NULL THEN ov.vn END)) AS count_cc,
  COUNT(DISTINCT (CASE WHEN lh.lab_order_number IS NOT NULL THEN lh.hn END)) AS count_lab,
  COUNT(DISTINCT (CASE WHEN xr.xn IS NOT NULL THEN xr.hn END)) AS count_xray,
  COUNT(DISTINCT (CASE WHEN oapp.hn IS NOT NULL THEN oapp.hn END)) AS count_oapp
FROM ckup_ovst ov
LEFT JOIN officer o ON o.officer_login_name = ov.staff
LEFT JOIN opdscreen op ON ov.vn = op.vn
LEFT JOIN lab_head lh ON lh.order_staff = ov.staff AND lh.vn = ov.vn
LEFT JOIN xray_report xr ON xr.request_staff = ov.staff AND xr.vn = ov.vn
LEFT JOIN oapp ON oapp.app_user = ov.staff AND oapp.vn = ov.vn
WHERE TO_CHAR(ov.vstdate, 'yyyy-mm-dd') BETWEEN '{dateFrom}' AND '{dateTo}'
  AND o.officer_name NOT LIKE '%BMS%'
  AND o.officer_login_name <> 'cu'
GROUP BY o.officer_login_name, o.officer_name`
  },
  {
    id: 'hemodialysis',
    name: 'Hemodialysis',
    nameTh: 'ระบบงานไตเทียม',
    icon: '&#129516;',
    columns: [
      { key: 'staff', label: 'Login' },
      { key: 'name', label: 'ชื่อ-นามสกุล' },
      { key: 'bp_o', label: 'Vital Sign', type: 'num' },
      { key: 'cc_o', label: 'CC', type: 'num' },
      { key: 'hpi_text', label: 'HPI', type: 'num' },
      { key: 'dp_o', label: 'หัตถการ', type: 'num' },
      { key: 'lab_o', label: 'สั่ง LAB', type: 'num' },
      { key: 'xray_o', label: 'X-Ray', type: 'num' },
      { key: 'oapp_o', label: 'นัด', type: 'num' },
      { key: 'opi1_o', label: 'สั่งยา', type: 'num' },
      { key: 'opi3_o', label: 'เวชภัณฑ์', type: 'num' },
    ],
    sql: `SELECT tt.staff, tt.name,
  count(distinct tt.bp_accept) as bp_o, count(distinct tt.cc_accept) as cc_o,
  count(distinct tt.hpi_text) as hpi_text, count(distinct tt.dp_accept) as dp_o,
  count(distinct tt.lab_accept) as lab_o, count(distinct tt.xray_accept) as xray_o,
  count(distinct tt.oapp_accept) as oapp_o, count(distinct tt.opi_accept) as opi1_o,
  count(distinct tt.opi3_accept) as opi3_o
FROM (
  SELECT d.staff, u.name,
    case when op.cc <> '' then op.vn end as cc_accept,
    case when op.bpd is not null then op.vn end as bp_accept,
    case when hpi.hpi_text <> '' then hpi.vn end as hpi_text,
    case when lh.form_name is not null then lh.vn end as lab_accept,
    case when x.xray_order_number is not null then x.vn end as xray_accept,
    case when o.oapp_id is not null then o.oapp_id end as oapp_accept,
    case when opi.icode like '1%' then opi.icode end as opi_accept,
    case when opi.icode like '3%' then opi.icode end as opi3_accept,
    case when dp.er_oper_code is not null then dp.er_oper_code end as dp_accept
  FROM opdscreen_cc_list d
  LEFT JOIN opduser u ON u.loginname = d.staff
  LEFT JOIN opdscreen op ON d.vn = op.vn
  LEFT JOIN patient_history_hpi hpi ON hpi.vn = op.vn
  LEFT JOIN lab_head lh ON d.vn = lh.vn LEFT JOIN xray_head x ON d.vn = x.vn
  LEFT JOIN oapp o ON d.vn = o.vn LEFT JOIN opitemrece opi ON d.vn = opi.vn
  LEFT JOIN doctor_operation dp ON d.vn = dp.vn
  LEFT JOIN doctor dc ON u.doctorcode = dc.code
  WHERE d.update_datetime BETWEEN '{dateFrom}' AND '{dateTo}'
    AND u.name NOT LIKE '%BMS%' AND dc.position_id <> '1'
) tt GROUP BY tt.staff, tt.name`
  },
  {
    id: 'dental',
    name: 'Dental',
    nameTh: 'ระบบงานทันตกรรม',
    icon: '&#129463;',
    columns: [
      { key: 'staff', label: 'Login' },
      { key: 'name', label: 'ชื่อ-นามสกุล' },
      { key: 'cc_accept', label: 'CC', type: 'num' },
      { key: 'bp_accept', label: 'Vital Sign', type: 'num' },
      { key: 'dc_accept', label: 'Dental Care', type: 'num' },
      { key: 'dt_accept', label: 'หัตถการทันต์', type: 'num' },
      { key: 'lab_accept', label: 'สั่ง LAB', type: 'num' },
      { key: 'xray_accept', label: 'X-Ray', type: 'num' },
      { key: 'oapp_accept', label: 'นัด', type: 'num' },
      { key: 'opi_accept', label: 'สั่งยา', type: 'num' },
      { key: 'opi3_accept', label: 'เวชภัณฑ์', type: 'num' },
    ],
    sql: `SELECT ou.name, dt.staff,
  COALESCE(pq.pq_screen_vn, 0) as cc_accept, COALESCE(bpd.bp_screen_vn, 0) as bp_accept,
  COALESCE(dencare.dc_count, 0) as dc_accept, COALESCE(dtm.count_tmcode, 0) as dt_accept,
  COALESCE(lh.count_lab, 0) as lab_accept, COALESCE(xh.count_xray, 0) as xray_accept,
  COALESCE(oa.count_oapp, 0) as oapp_accept, COALESCE(op1.opi_accept, 0) as opi_accept,
  COALESCE(op3.opi3_accept, 0) as opi3_accept
FROM (SELECT dt.staff FROM dtmain dt WHERE dt.update_datetime BETWEEN '{dateFrom}' AND '{dateTo}' GROUP BY dt.staff) dt
LEFT JOIN (SELECT dt.staff, count(distinct os.vn) as pq_screen_vn FROM dtmain dt LEFT JOIN opdscreen os ON os.vn = dt.vn WHERE update_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND cc <> '' GROUP BY dt.staff) pq ON pq.staff = dt.staff
LEFT JOIN (SELECT dt.staff, count(distinct os.vn) as bp_screen_vn FROM dtmain dt LEFT JOIN opdscreen os ON os.vn = dt.vn WHERE update_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND bpd IS NOT NULL GROUP BY dt.staff) bpd ON bpd.staff = dt.staff
LEFT JOIN opduser ou ON ou.loginname = dt.staff
LEFT JOIN (SELECT ou.loginname as staff, count(vn) as dc_count FROM dental_care dc LEFT JOIN opduser ou ON ou.doctorcode = dc.doctor WHERE vn IN (SELECT vn FROM dtmain WHERE update_datetime BETWEEN '{dateFrom}' AND '{dateTo}') AND dc.entry_datetime BETWEEN '{dateFrom}' AND '{dateTo}' GROUP BY ou.loginname) dencare ON dencare.staff = dt.staff
LEFT JOIN (SELECT staff, count(distinct tmcode) as count_tmcode FROM dtmain WHERE update_datetime BETWEEN '{dateFrom}' AND '{dateTo}' GROUP BY staff) dtm ON dtm.staff = dt.staff
LEFT JOIN (SELECT dt.staff, count(distinct lh.lab_order_number) as count_lab FROM lab_head lh LEFT JOIN dtmain dt ON dt.vn = lh.vn WHERE dt.update_datetime BETWEEN '{dateFrom}' AND '{dateTo}' GROUP BY dt.staff) lh ON lh.staff = dt.staff
LEFT JOIN (SELECT dt.staff, count(distinct xh.vn) as count_xray FROM xray_head xh LEFT JOIN dtmain dt ON dt.vn = xh.vn WHERE dt.update_datetime BETWEEN '{dateFrom}' AND '{dateTo}' GROUP BY dt.staff) xh ON xh.staff = dt.staff
LEFT JOIN (SELECT dt.staff, count(oa.oapp_id) as count_oapp FROM oapp oa LEFT JOIN dtmain dt ON dt.vn = oa.vn WHERE dt.update_datetime BETWEEN '{dateFrom}' AND '{dateTo}' GROUP BY dt.staff) oa ON oa.staff = dt.staff
LEFT JOIN (SELECT dt.staff, count(distinct op.icode) as opi_accept FROM opitemrece op LEFT JOIN dtmain dt ON dt.vn = op.vn WHERE dt.update_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND op.icode LIKE '1%' GROUP BY dt.staff) op1 ON op1.staff = dt.staff
LEFT JOIN (SELECT dt.staff, count(distinct op.icode) as opi3_accept FROM opitemrece op LEFT JOIN dtmain dt ON dt.vn = op.vn WHERE dt.update_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND op.icode LIKE '3%' GROUP BY dt.staff) op3 ON op3.staff = dt.staff
WHERE ou.name NOT LIKE '%BMS%' AND dt.staff <> 'dental'`
  },
  {
    id: 'insurance',
    name: 'Insurance',
    nameTh: 'ระบบงานประกัน',
    icon: '&#128179;',
    columns: [
      { key: 'staff', label: 'Login' },
      { key: 'officer_name', label: 'ชื่อ-นามสกุล' },
      { key: 'ed', label: 'เพิ่มสิทธิ์', type: 'num' },
      { key: 'ad', label: 'เช็คสิทธิ์', type: 'num' },
      { key: 'rcpt', label: 'ออกใบเสร็จ', type: 'num' },
      { key: 'rcpt2', label: 'เบิกสด', type: 'num' },
    ],
    sql: `SELECT f.staff, ff.officer_name,
  COUNT(DISTINCT CASE WHEN f.officer_activity_log_table = 'visit_pttype' AND f.officer_activity_log_operation = 'Edit' THEN f.officer_activity_log_key_value END) AS ed,
  COUNT(DISTINCT CASE WHEN f.officer_activity_log_table = 'visit_pttype' AND f.officer_activity_log_operation = 'Add' THEN f.officer_activity_log_key_value END) AS ad,
  COUNT(DISTINCT CASE WHEN f.officer_activity_log_table = 'rcpt_print' THEN f.officer_activity_log_key_value END) AS rcpt,
  COUNT(DISTINCT CASE WHEN f.officer_activity_log_table = 'rcpt_debt' THEN f.officer_activity_log_key_value END) AS rcpt2
FROM officer_activity_log f
LEFT JOIN officer ff ON ff.officer_login_name = f.staff
WHERE f.officer_activity_log_date::DATE BETWEEN '{dateFrom}' AND '{dateTo}'
  AND f.staff IN (SELECT ol.officer_login_name FROM officer_group og, officer_group_list ogl, officer ol WHERE og.officer_group_id = ogl.officer_group_id AND ol.officer_id = ogl.officer_id AND og.officer_group_name LIKE '%ศูนย์สิทธิ%')
  AND ff.officer_name NOT LIKE '%BMS%'
GROUP BY f.staff, ff.officer_name`
  },
  {
    id: 'anesthesia',
    name: 'Anesthesia',
    nameTh: 'ระบบงานวิสัญญี',
    icon: '&#128137;',
    columns: [
      { key: 'officer_login_name', label: 'Login' },
      { key: 'officer_name', label: 'ชื่อ-นามสกุล' },
      { key: 'cc_hn', label: 'จำนวน HN', type: 'num' },
      { key: 'cc_case', label: 'จำนวน Case', type: 'num' },
      { key: 'cc_visit', label: 'Visit', type: 'num' },
      { key: 'cc_screen', label: 'Screen', type: 'num' },
      { key: 'cc_anes', label: 'Anes', type: 'num' },
      { key: 'cc_operlist', label: 'Oper List', type: 'num' },
      { key: 'cc_icode', label: 'รายการยา', type: 'num' },
    ],
    sql: `SELECT o.officer_login_name, o.officer_name,
  count(distinct ol.hn) as cc_hn, count(distinct ol.operation_id) as cc_case,
  count(distinct(case when ovl.operation_visit_list_id is not null then ol.hn end)) as cc_visit,
  count(distinct(case when os.operation_screen_id is not null then ol.hn end)) as cc_screen,
  count(distinct(case when oa.anes_id is not null then ol.hn end)) as cc_anes,
  count(distinct oal.operation_anes_oper_list_id) as cc_operlist,
  count(distinct op.icode) as cc_icode
FROM officer o
LEFT JOIN operation_list ol ON o.officer_login_name = ol.staff
LEFT JOIN operation_visit_list ovl ON ol.operation_id = ovl.operation_id
LEFT JOIN operation_screen os ON os.operation_id = ol.operation_id
LEFT JOIN operation_anes oa ON oa.operation_id = ol.operation_id
LEFT JOIN operation_anes_oper_list oal ON oal.operation_id = ol.operation_id
LEFT JOIN opitemrece op ON o.officer_login_name = op.staff AND rxdate BETWEEN '{dateFrom}' AND '{dateTo}'
WHERE o.officer_id IN (SELECT officer_id FROM officer_group_list WHERE officer_group_id = '25')
  AND ol.operation_date BETWEEN '{dateFrom}' AND '{dateTo}'
  AND o.officer_login_name NOT ILIKE '%bms%'
GROUP BY o.officer_login_name, o.officer_name`
  },
  {
    id: 'social-medicine',
    name: 'Social Medicine',
    nameTh: 'ระบบงานเวชกรรมสังคม',
    icon: '&#127963;',
    columns: [
      { key: 'officer_login_name', label: 'Login' },
      { key: 'officer_name', label: 'ชื่อ-นามสกุล' },
      { key: 'cc_newhn', label: 'HN ใหม่', type: 'num' },
      { key: 'cc_newptt', label: 'สิทธิ์ใหม่', type: 'num' },
      { key: 'count', label: 'New Visit', type: 'num' },
      { key: 'vn_bps', label: 'Vital Sign', type: 'num' },
      { key: 'vn_cc', label: 'CC', type: 'num' },
      { key: 'pi_ac', label: 'HPI', type: 'num' },
      { key: 'cc_lab', label: 'LAB', type: 'num' },
      { key: 'cc_diag', label: 'Diag', type: 'num' },
      { key: 'cc_icode', label: 'สั่งยา', type: 'num' },
    ],
    sql: `SELECT * FROM (
  SELECT oc.officer_login_name, oc.officer_name,
    count(distinct pl.hn) as cc_newhn,
    count(distinct(case when pp.hn is not null then pp.hn end)) as cc_newptt
  FROM patient_log pl
  LEFT JOIN officer oc ON oc.officer_login_name = pl.staff
  LEFT JOIN patient_pttype pp ON pp.hn = pl.hn AND pp.staff = pl.staff
  WHERE pl.log_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND oc.officer_name NOT LIKE '%BMS%'
  GROUP BY oc.officer_login_name, oc.officer_name
) new_hn
LEFT JOIN (SELECT count(vn), staff FROM ovst_service_time ost WHERE ost.service_begin_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND ost.ovst_service_time_type_code = 'OPD-NEW-VISIT' GROUP BY staff) new_vn ON new_vn.staff = new_hn.officer_login_name
LEFT JOIN (SELECT count(distinct(case when occ.cc is not null then occ.vn end)) as vn_cc, count(distinct(case when o.bps is not null then o.vn end)) as vn_bps, count(distinct(case when o.hpi is not null then o.vn end)) as pi_ac, occ.staff as cc_staff FROM opdscreen_cc_list occ LEFT JOIN opdscreen o ON o.vn = occ.vn WHERE occ.update_datetime BETWEEN '{dateFrom}' AND '{dateTo}' GROUP BY occ.staff) screen ON screen.cc_staff = new_hn.officer_login_name
LEFT JOIN (SELECT count(lab_order_number) as cc_lab, order_staff FROM lab_head WHERE update_datetime BETWEEN '{dateFrom}' AND '{dateTo}' GROUP BY order_staff) lab ON lab.order_staff = new_hn.officer_login_name
LEFT JOIN (SELECT count(vn) as cc_diag, staff as diag_staff FROM ovstdiag WHERE update_datetime BETWEEN '{dateFrom}' AND '{dateTo}' GROUP BY staff) diag ON diag.diag_staff = new_hn.officer_login_name
LEFT JOIN (SELECT count(icode) as cc_icode, staff as i_staff FROM opitemrece WHERE last_modified BETWEEN '{dateFrom}' AND '{dateTo}' GROUP BY staff) icode ON icode.i_staff = new_hn.officer_login_name`
  },
  {
    id: 'rehabilitation',
    name: 'Rehabilitation',
    nameTh: 'ระบบงานเวชศาสตร์ฟื้นฟู',
    icon: '&#129468;',
    columns: [
      { key: 'staff', label: 'Login' },
      { key: 'name', label: 'ชื่อ-นามสกุล' },
      { key: 'dp_o', label: 'Plan', type: 'num' },
      { key: 'cc_o', label: 'CC', type: 'num' },
      { key: 'bp_o', label: 'Vital Sign', type: 'num' },
      { key: 'pmh_o', label: 'PMH', type: 'num' },
      { key: 'lab_o', label: 'LAB', type: 'num' },
      { key: 'xray_o', label: 'X-Ray', type: 'num' },
      { key: 'oapp_o', label: 'นัด', type: 'num' },
      { key: 'opi1_o', label: 'สั่งยา', type: 'num' },
      { key: 'opi3_o', label: 'เวชภัณฑ์', type: 'num' },
    ],
    sql: `SELECT p.physic_plan_staff as staff, u.name,
  count(distinct ppd.physic_plan_detail_id) as dp_o,
  (SELECT count(opdscreen_cc_list_id) FROM opdscreen_cc_list d WHERE d.staff = p.physic_plan_staff AND d.update_datetime BETWEEN '{dateFrom}' AND '{dateTo}') as cc_o,
  (SELECT count(o.vn) FROM opdscreen_cc_list d LEFT JOIN opdscreen o ON o.vn = d.vn WHERE d.staff = p.physic_plan_staff AND (o.bpd is not null or bps is not null) AND d.update_datetime BETWEEN '{dateFrom}' AND '{dateTo}') as bp_o,
  (SELECT count(o.vn) FROM opdscreen_cc_list d LEFT JOIN opdscreen o ON o.vn = d.vn WHERE d.staff = p.physic_plan_staff AND o.pmh is not null AND d.update_datetime BETWEEN '{dateFrom}' AND '{dateTo}') as pmh_o,
  (SELECT count(lh.lab_order_number) FROM lab_head lh WHERE lh.order_staff = p.physic_plan_staff AND lh.update_datetime BETWEEN '{dateFrom}' AND '{dateTo}') as lab_o,
  (SELECT count(x.xn) FROM xray_report x WHERE x.request_staff = p.physic_plan_staff AND x.order_datetime BETWEEN '{dateFrom}' AND '{dateTo}') as xray_o,
  (SELECT count(distinct o.vn) FROM oapp o WHERE o.app_user = p.physic_plan_staff AND o.update_datetime BETWEEN '{dateFrom}' AND '{dateTo}') as oapp_o,
  (SELECT count(distinct opi.icode) FROM opitemrece opi WHERE opi.staff = p.physic_plan_staff AND opi.last_modified BETWEEN '{dateFrom}' AND '{dateTo}' AND opi.icode like '1%') as opi1_o,
  (SELECT count(distinct opi.icode) FROM opitemrece opi WHERE opi.staff = p.physic_plan_staff AND opi.last_modified BETWEEN '{dateFrom}' AND '{dateTo}' AND opi.icode like '3%') as opi3_o
FROM physic_plan p
LEFT JOIN opduser u ON u.loginname = p.physic_plan_staff
LEFT JOIN physic_plan_detail ppd ON p.physic_plan_id = ppd.physic_plan_id
WHERE p.physic_plan_lastupdate BETWEEN '{dateFrom}' AND '{dateTo}' AND u.name NOT LIKE '%BMS%'
GROUP BY p.physic_plan_staff, u.name`
  },
  {
    id: 'medical-stat',
    name: 'Medical Statistics',
    nameTh: 'ระบบงานเวชสถิติ',
    icon: '&#128200;',
    columns: [
      { key: 'staff', label: 'Login' },
      { key: 'officer_name', label: 'ชื่อ-นามสกุล' },
      { key: 'opd_rent', label: 'OPD Rent', type: 'num' },
      { key: 'opd_file', label: 'OPD File', type: 'num' },
      { key: 'ipd_rent', label: 'IPD Rent', type: 'num' },
      { key: 'ipd_file', label: 'IPD File', type: 'num' },
      { key: 'ovst_diag', label: 'OPD Diag', type: 'num' },
      { key: 'doctor_operation', label: 'ICD9', type: 'num' },
      { key: 'ipt_diag', label: 'IPD Diag', type: 'num' },
      { key: 'ipd_oper', label: 'IPD Oper', type: 'num' },
      { key: 'an', label: 'Chart', type: 'num' },
    ],
    sql: `SELECT o.officer_login_name AS staff, o.officer_name,
  (SELECT count(distinct rent_id) FROM opdrent WHERE rent_date BETWEEN '{dateFrom}' AND '{dateTo}' AND rent_user = o.officer_login_name) AS opd_rent,
  (SELECT count(distinct patient_opd_file_id) FROM patient_opd_file WHERE last_datetime::date BETWEEN '{dateFrom}' AND '{dateTo}' AND last_staff = o.officer_login_name) AS opd_file,
  (SELECT count(distinct rent_id) FROM ipdrent WHERE rent_date BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = o.officer_login_name) AS ipd_rent,
  (SELECT count(distinct patient_ipd_file_id) FROM patient_ipd_file WHERE last_datetime::date BETWEEN '{dateFrom}' AND '{dateTo}' AND last_staff = o.officer_login_name) AS ipd_file,
  (SELECT count(distinct vn) FROM ovstdiag WHERE vstdate BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = o.officer_login_name AND (left(icd10,1) ~ '[[:alpha:]]')) AS ovst_diag,
  (SELECT count(distinct ovst_diag_id) FROM ovstdiag WHERE vstdate BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = o.officer_login_name AND NOT(left(icd10,1) ~ '[[:alpha:]]')) AS doctor_operation,
  (SELECT count(distinct an) FROM iptdiag WHERE entry_datetime::date BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = o.officer_login_name) AS ipt_diag,
  (SELECT count(distinct iptoprt_id) FROM iptoprt WHERE entry_datetime::date BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = o.officer_login_name) AS ipd_oper,
  (SELECT count(distinct an) FROM ipt_chart_location WHERE chart_date BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = o.officer_login_name) AS an
FROM officer o
INNER JOIN officer_group_list ogl ON o.officer_id = ogl.officer_id
INNER JOIN officer_group og ON ogl.officer_group_id = og.officer_group_id
WHERE og.officer_group_name LIKE '%ห้องบัตร%'
  AND o.officer_active = 'Y'
GROUP BY o.officer_login_name, o.officer_name`
  },
  {
    id: 'medical-record',
    name: 'Medical Records',
    nameTh: 'ระบบงานเวชระเบียน',
    icon: '&#128451;',
    columns: [
      { key: 'staff', label: 'Login' },
      { key: 'officer_name', label: 'ชื่อ-นามสกุล' },
      { key: 'new_hn', label: 'HN ใหม่', type: 'num' },
      { key: 'pttype', label: 'สิทธิ์', type: 'num' },
      { key: 'new_visit', label: 'New Visit', type: 'num' },
      { key: 'new_visit_oapp', label: 'Visit+นัด', type: 'num' },
      { key: 'pttype_check', label: 'เช็คสิทธิ์', type: 'num' },
      { key: 'referin', label: 'Refer In', type: 'num' },
      { key: 'count_pttype', label: 'สิทธิ์ซ้ำ', type: 'num' },
    ],
    sql: `SELECT o.officer_login_name AS staff, o.officer_name,
  (SELECT count(distinct hn) FROM patient_log WHERE log_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = o.officer_login_name) AS new_hn,
  (SELECT count(distinct l.officer_activity_log_key_value) FROM officer_activity_log l WHERE officer_activity_log_table = 'patient_pttype' AND officer_activity_log_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = o.officer_login_name) AS pttype,
  (SELECT count(distinct vn) FROM ovst_service_time WHERE service_begin_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = o.officer_login_name AND ovst_service_time_type_code = 'OPD-NEW-VISIT') AS new_visit,
  (SELECT count(distinct oa.vn) FROM ovst_service_time ost JOIN oapp oa ON oa.visit_vn = ost.vn WHERE ost.service_begin_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND ost.staff = o.officer_login_name AND ost.ovst_service_time_type_code LIKE 'OPD-NEW-VISIT%') AS new_visit_oapp,
  (SELECT count(distinct anvn) FROM (SELECT an AS anvn FROM ipt_pttype_check WHERE pttype_check_staff = o.officer_login_name AND pttype_check_datetime BETWEEN '{dateFrom}' AND '{dateTo}' UNION SELECT vn AS anvn FROM ovst_seq WHERE pttype_check_staff = o.officer_login_name AND pttype_check_datetime BETWEEN '{dateFrom}' AND '{dateTo}') tmp) AS pttype_check,
  (SELECT count(distinct r.vn) FROM ovst_service_time ost JOIN referin r ON r.vn = ost.vn WHERE ost.service_begin_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND ost.staff = o.officer_login_name AND ost.ovst_service_time_type_code LIKE 'OPD-NEW-VISIT%') AS referin,
  (SELECT count(distinct vn) FROM (SELECT vn, count(*) FROM visit_pttype WHERE update_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = o.officer_login_name GROUP BY vn HAVING count(*) > 1) tmp) AS count_pttype
FROM officer o
INNER JOIN officer_group_list ogl ON o.officer_id = ogl.officer_id
INNER JOIN officer_group og ON ogl.officer_group_id = og.officer_group_id
WHERE og.officer_group_name ILIKE '%เวชระเบียน%'
  AND o.officer_active = 'Y'
GROUP BY o.officer_login_name, o.officer_name`
  },
  {
    id: 'doctor',
    name: 'Doctor',
    nameTh: 'ระบบงานแพทย์',
    icon: '&#129658;',
    columns: [
      { key: 'name', label: 'ชื่อ-นามสกุล' },
      { key: 'ov_d', label: 'ตรวจ OPD', type: 'num' },
      { key: 'dx_d', label: 'Diag', type: 'num' },
      { key: 'dx_txt_d', label: 'DiagText', type: 'num' },
      { key: 'hpi_d', label: 'HPI', type: 'num' },
      { key: 'lab_d', label: 'สั่ง LAB', type: 'num' },
      { key: 'xray_d', label: 'X-Ray', type: 'num' },
      { key: 'oapp_d', label: 'นัด', type: 'num' },
      { key: 'opi1_d', label: 'สั่งยา', type: 'num' },
    ],
    sql: `SELECT tt.code, tt.name, tt.dsname,
  count(distinct tt.ov_doc) as ov_d, count(distinct tt.dx_doc) as dx_d,
  count(distinct tt.dx_txt_doc) as dx_txt_d, count(distinct tt.hpi_doc) as hpi_d,
  count(distinct tt.lab_doc) as lab_d, count(distinct tt.xray_doc) as xray_d,
  count(distinct tt.oapp_doc) as oapp_d, SUM(tt.opi_doc) as opi1_d
FROM (
  SELECT c.code, c.name, ds.name as dsname, d.vn,
    MAX(CASE WHEN d.vn <> '' THEN d.vn END) AS ov_doc,
    MAX(CASE WHEN v.pdx IS NOT NULL THEN v.vn END) AS dx_doc,
    MAX(CASE WHEN odd.vn IS NOT NULL THEN odd.vn END) AS dx_txt_doc,
    MAX(CASE WHEN lh.form_name IS NOT NULL THEN lh.vn END) AS lab_doc,
    MAX(CASE WHEN x.xray_order_number IS NOT NULL THEN x.vn END) AS xray_doc,
    MAX(CASE WHEN o.oapp_id IS NOT NULL THEN o.oapp_id END) AS oapp_doc,
    COUNT(DISTINCT CASE WHEN opi.icode LIKE '1%' THEN opi.hos_guid END) AS opi_doc,
    MAX(CASE WHEN s.hpi_text IS NOT NULL THEN s.vn END) AS hpi_doc
  FROM ovst_doctor_sign d
  INNER JOIN doctor c ON d.doctor = c.code
  LEFT JOIN vn_stat v ON d.vn = v.vn
  LEFT JOIN ovst_doctor_diag odd ON odd.vn = d.vn AND odd.doctor_code = d.doctor
  LEFT JOIN lab_head lh ON d.vn = lh.vn
  LEFT JOIN xray_head x ON d.vn = x.vn
  LEFT JOIN opitemrece opi ON d.vn = opi.vn AND opi.doctor = d.doctor
  LEFT JOIN oapp o ON d.vn = o.vn
  LEFT JOIN patient_history_hpi s ON d.vn = s.vn AND d.doctor = s.doctor_code
  LEFT JOIN doctor_position ds ON c.position_id = ds.id
  WHERE d.sign_datetime::date BETWEEN '{dateFrom}' AND '{dateTo}'
    AND c.name NOT LIKE '%BMS%' AND c.position_id IN ('1')
  GROUP BY c.code, c.name, ds.name, d.vn
) AS tt GROUP BY tt.code, tt.name, tt.dsname ORDER BY tt.name`
  },
  {
    id: 'thai-medicine',
    name: 'Thai Medicine',
    nameTh: 'ระบบงานแพทย์แผนไทย',
    icon: '&#127807;',
    columns: [
      { key: 'officer_login_name', label: 'Login' },
      { key: 'name', label: 'ชื่อ-นามสกุล' },
      { key: 'bp_d', label: 'Vital Sign', type: 'num' },
      { key: 'cc_d', label: 'CC', type: 'num' },
      { key: 'hpi_d', label: 'HPI', type: 'num' },
      { key: 'dx_d', label: 'Diag', type: 'num' },
      { key: 'dp_d', label: 'หัตถการ', type: 'num' },
      { key: 'lab_d', label: 'LAB', type: 'num' },
      { key: 'xray_d', label: 'X-Ray', type: 'num' },
      { key: 'oapp_d', label: 'นัด', type: 'num' },
      { key: 'opi1_d', label: 'สั่งยา', type: 'num' },
      { key: 'health_d', label: 'Health Med', type: 'num' },
    ],
    sql: `SELECT tt.code, tt.name, tt.officer_login_name,
  count(distinct tt.ov_doc) as ov_d, count(distinct tt.dx_doc) as dx_d,
  count(distinct tt.lab_doc) as lab_d, count(distinct tt.xray_doc) as xray_d,
  count(distinct tt.oapp_doc) as oapp_d, count(distinct tt.opi_doc) as opi1_d,
  count(distinct tt.dp_doc) as dp_d, count(distinct tt.hpi_doc) as hpi_d,
  count(distinct tt.cc_doc) as cc_d, count(distinct tt.bp_doc) as bp_d,
  count(distinct tt.health_doc) as health_d
FROM (
  SELECT c.code, c.name, u.officer_login_name,
    case when d.vn <> '' then d.vn end as ov_doc,
    case when v.pdx is not null then v.vn end as dx_doc,
    case when lh.form_name is not null then lh.vn end as lab_doc,
    case when x.xray_order_number is not null then x.vn end as xray_doc,
    case when o.oapp_id is not null then o.oapp_id end as oapp_doc,
    case when opi.icode like '1%' then opi.icode end as opi_doc,
    case when dp.er_oper_code is not null then dp.er_oper_code end as dp_doc,
    case when s.hpi_text is not null then s.vn end as hpi_doc,
    case when os.cc is not null then d.vn end as cc_doc,
    case when os.bps is not null then d.vn end as bp_doc,
    case when hms.vn is not null then d.vn end as health_doc
  FROM ovst_doctor_sign d
  LEFT JOIN doctor c ON d.doctor = c.code
  LEFT JOIN vn_stat v ON d.vn = v.vn LEFT JOIN lab_head lh ON d.vn = lh.vn
  LEFT JOIN xray_head x ON d.vn = x.vn LEFT JOIN opitemrece opi ON d.vn = opi.vn
  LEFT JOIN doctor_operation dp ON d.vn = dp.vn LEFT JOIN oapp o ON d.vn = o.vn
  LEFT JOIN patient_history_hpi s ON d.vn = s.vn AND d.doctor = s.doctor_code
  LEFT JOIN officer u ON u.officer_doctor_code = c.code
  LEFT JOIN opdscreen os ON os.vn = d.vn
  LEFT JOIN health_med_service hms ON hms.vn = d.vn
  WHERE d.sign_datetime BETWEEN '{dateFrom}' AND '{dateTo}'
    AND c.name NOT LIKE '%BMS%' AND d.depcode IN ('179','178')
) tt GROUP BY tt.code, tt.name, tt.officer_login_name ORDER BY ov_d DESC`
  },
  {
    id: 'nutrition',
    name: 'Nutrition',
    nameTh: 'ระบบงานโภชนาการ',
    icon: '&#127858;',
    columns: [
      { key: 'officer_login_name', label: 'Login' },
      { key: 'officer_name', label: 'ชื่อ-นามสกุล' },
      { key: 'confirm', label: 'ยืนยัน', type: 'num' },
      { key: 'confirm_an', label: 'AN ยืนยัน', type: 'num' },
      { key: 'send', label: 'ส่งอาหาร', type: 'num' },
      { key: 'send_an', label: 'AN ส่ง', type: 'num' },
    ],
    sql: `SELECT officer.officer_login_name, officer.officer_name,
  (SELECT count(*) FROM nutrition_food_ord_detail WHERE dietician_staff_confirm_date::DATE BETWEEN '{dateFrom}' AND '{dateTo}' AND dietician_confirm = 'Y' AND dietician_staff_confirm = officer.officer_login_name) as confirm,
  (SELECT count(distinct nutrition_food_ord_id) FROM nutrition_food_ord_detail WHERE dietician_staff_confirm_date::DATE BETWEEN '{dateFrom}' AND '{dateTo}' AND dietician_confirm = 'Y' AND dietician_staff_confirm = officer.officer_login_name) as confirm_an,
  (SELECT count(*) FROM nutrition_food_ord_detail WHERE send_datetime::DATE BETWEEN '{dateFrom}' AND '{dateTo}' AND send_status = 'Y' AND send_staff = officer.officer_login_name) as send,
  (SELECT count(distinct nutrition_food_ord_id) FROM nutrition_food_ord_detail WHERE send_datetime::DATE BETWEEN '{dateFrom}' AND '{dateTo}' AND send_status = 'Y' AND send_staff = officer.officer_login_name) as send_an
FROM officer
INNER JOIN officer_group_list ON officer_group_list.officer_id = officer.officer_id
INNER JOIN officer_group ON officer_group_list.officer_group_id = officer_group.officer_group_id
WHERE officer_group.officer_group_name LIKE '%โภชนาการ%'
GROUP BY officer.officer_login_name, officer.officer_name`
  },
  {
    id: 'health-promotion',
    name: 'Health Promotion',
    nameTh: 'ระบบงานส่งเสริม',
    icon: '&#128154;',
    columns: [
      { key: 'staff', label: 'Login' },
      { key: 'name', label: 'ชื่อ-นามสกุล' },
      { key: 'bp_o', label: 'Vital Sign', type: 'num' },
      { key: 'cc_o', label: 'CC', type: 'num' },
      { key: 'hpi_text', label: 'HPI', type: 'num' },
      { key: 'dp_o', label: 'หัตถการ', type: 'num' },
      { key: 'lab_o', label: 'LAB', type: 'num' },
      { key: 'xray_o', label: 'X-Ray', type: 'num' },
      { key: 'oapp_o', label: 'นัด', type: 'num' },
      { key: 'opi1_o', label: 'สั่งยา', type: 'num' },
      { key: 'opi3_o', label: 'เวชภัณฑ์', type: 'num' },
    ],
    sql: `SELECT tt.staff, tt.name,
  count(distinct tt.bp_accept) as bp_o, count(distinct tt.cc_accept) as cc_o,
  count(distinct tt.hpi_text) as hpi_text, count(distinct tt.dp_accept) as dp_o,
  count(distinct tt.lab_accept) as lab_o, count(distinct tt.xray_accept) as xray_o,
  count(distinct tt.oapp_accept) as oapp_o, count(distinct tt.opi_accept) as opi1_o,
  count(distinct tt.opi3_accept) as opi3_o
FROM (
  SELECT d.staff, u.name,
    case when op.cc <> '' then op.vn end as cc_accept,
    case when op.bpd is not null then op.vn end as bp_accept,
    case when hpi.hpi_text <> '' then hpi.vn end as hpi_text,
    case when lh.form_name is not null then lh.vn end as lab_accept,
    case when x.xray_order_number is not null then x.vn end as xray_accept,
    case when o.oapp_id is not null then o.oapp_id end as oapp_accept,
    case when opi.icode like '1%' then opi.icode end as opi_accept,
    case when opi.icode like '3%' then opi.icode end as opi3_accept,
    case when dp.er_oper_code is not null then dp.er_oper_code end as dp_accept
  FROM opdscreen_cc_list d
  LEFT JOIN opduser u ON u.loginname = d.staff LEFT JOIN opdscreen op ON d.vn = op.vn
  LEFT JOIN patient_history_hpi hpi ON hpi.vn = op.vn
  LEFT JOIN lab_head lh ON d.vn = lh.vn LEFT JOIN xray_head x ON d.vn = x.vn
  LEFT JOIN oapp o ON d.vn = o.vn LEFT JOIN opitemrece opi ON d.vn = opi.vn
  LEFT JOIN doctor_operation dp ON d.vn = dp.vn LEFT JOIN doctor dc ON u.doctorcode = dc.code
  WHERE d.update_datetime BETWEEN '{dateFrom}' AND '{dateTo}'
    AND u.name NOT ILIKE '%BMS%' AND dc.position_id <> '1'
    AND d.staff NOT IN('healthmed','psy','opd')
) tt GROUP BY tt.staff, tt.name`
  },
  {
    id: 'labor-room',
    name: 'Labor Room',
    nameTh: 'ระบบงานห้องคลอด',
    icon: '&#128118;',
    columns: [
      { key: 'staff', label: 'Login' },
      { key: 'name', label: 'ชื่อ-นามสกุล' },
      { key: 'new_w', label: 'รับใหม่', type: 'num' },
      { key: 'move_w', label: 'ย้ายวอร์ด', type: 'num' },
      { key: 'dp_w', label: 'หัตถการ', type: 'num' },
      { key: 'lab_w', label: 'LAB', type: 'num' },
      { key: 'xray_w', label: 'X-Ray', type: 'num' },
      { key: 'oapp_w', label: 'นัด', type: 'num' },
      { key: 'bb_w', label: 'Blood Bank', type: 'num' },
      { key: 'dch_w', label: 'Discharge', type: 'num' },
      { key: 'labor_cc', label: 'คลอด', type: 'num' },
    ],
    sql: `SELECT tt.staff, tt.name,
  count(distinct tt.new_ipt) as new_w, count(distinct tt.move_ipt) as move_w,
  count(distinct tt.dp_ipt) as dp_w, count(distinct tt.lab_ipt) as lab_w,
  count(distinct tt.xray_ipt) as xray_w, count(distinct tt.oapp_ipt) as oapp_w,
  count(distinct tt.bb_ipt) as bb_w, count(distinct tt.dch_ipt) as dch_w,
  count(distinct tt.labor_c) as labor_cc
FROM (
  SELECT d.staff, u.officer_name as name,
    case when d.movereason = 'รับใหม่' then d.an end as new_ipt,
    case when d.movereason <> 'รับใหม่เข้าตึก' then d.an end as move_ipt,
    case when dp.ipt_oper_code is not null then dp.ipt_oper_code end as dp_ipt,
    case when lh.form_name is not null then lh.vn end as lab_ipt,
    case when x.xn is not null then x.an end as xray_ipt,
    case when o.oapp_id is not null then o.oapp_id end as oapp_ipt,
    case when bb.blb_request_id is not null then bb.blb_request_id end as bb_ipt,
    case when ip.an is not null then ip.an end as dch_ipt,
    li.infant_an as labor_c
  FROM iptbedmove d
  LEFT JOIN officer u ON u.officer_login_name = d.staff
  LEFT JOIN ipt_nurse_oper dp ON dp.staff = d.staff AND dp.entry_datetime BETWEEN '{dateFrom}' AND '{dateTo}'
  LEFT JOIN lab_head lh ON lh.order_staff = d.staff AND lh.entry_datetime BETWEEN '{dateFrom}' AND '{dateTo}'
  LEFT JOIN xray_report x ON x.request_staff = d.staff AND x.order_datetime BETWEEN '{dateFrom}' AND '{dateTo}'
  LEFT JOIN oapp o ON o.app_user = d.staff AND o.update_datetime BETWEEN '{dateFrom}' AND '{dateTo}'
  LEFT JOIN blb_request bb ON bb.staff = d.staff AND bb.last_update BETWEEN '{dateFrom}' AND '{dateTo}'
  LEFT JOIN (SELECT i.an, l.staff FROM ipt i, officer_activity_log l WHERE i.an = l.officer_activity_log_key_value AND officer_activity_log_table = 'ipt' AND officer_activity_log_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND i.confirm_discharge = 'Y') ip ON ip.staff = d.staff
  LEFT JOIN ipt_labour_infant li ON d.staff = li.entry_staff AND li.birth_date BETWEEN '{dateFrom}'::date AND '{dateTo}'::date
  WHERE d.entry_datetime BETWEEN '{dateFrom}' AND '{dateTo}' AND u.officer_name NOT LIKE '%BMS%'
) tt GROUP BY tt.staff, tt.name`
  },
  {
    id: 'pharmacy-opd',
    name: 'Pharmacy OPD',
    nameTh: 'ระบบงานห้องจ่ายยา',
    icon: '&#128138;',
    columns: [
      { key: 'staff', label: 'Login' },
      { key: 'officer_name', label: 'ชื่อ-นามสกุล' },
      { key: 'vn', label: 'จำนวน VN', type: 'num' },
      { key: 'rx', label: 'จ่ายยา Rx', type: 'num' },
      { key: 'drug', label: 'ยา', type: 'num' },
      { key: 'nondrug', label: 'Non-Drug', type: 'num' },
      { key: 'rx2', label: 'จ่ายยา Rx2', type: 'num' },
    ],
    sql: `SELECT rd.staff, o.officer_name,
  COUNT(DISTINCT rd.vn) AS vn,
  COUNT(DISTINCT CASE WHEN rd.rx_dispenser_detail_type = '1' THEN rd.vn END) AS rx,
  (SELECT COUNT(DISTINCT opi.hos_guid) FROM opitemrece opi WHERE opi.staff = rd.staff AND opi.rxdate BETWEEN '{dateFrom}' AND '{dateTo}' AND opi.icode LIKE '1%') AS drug,
  (SELECT COUNT(DISTINCT opi.hos_guid) FROM opitemrece opi WHERE opi.staff = rd.staff AND opi.rxdate BETWEEN '{dateFrom}' AND '{dateTo}' AND opi.icode NOT LIKE '1%') AS nondrug,
  COUNT(DISTINCT CASE WHEN rd.rx_dispenser_detail_type = '4' THEN rd.vn END) AS rx2
FROM rx_dispenser_detail rd
LEFT JOIN officer o ON o.officer_login_name = rd.staff
WHERE rd.rx_dispenser_datetime BETWEEN '{dateFrom}' AND '{dateTo}'
  AND o.officer_name NOT ILIKE '%BMS%'
GROUP BY rd.staff, o.officer_name`
  },
  {
    id: 'pharmacy-ipd',
    name: 'Pharmacy IPD',
    nameTh: 'ระบบงานห้องจ่ายยา IPD',
    icon: '&#128138;',
    columns: [
      { key: 'officer_login_name', label: 'Login' },
      { key: 'officer_name', label: 'ชื่อ-นามสกุล' },
      { key: 'med_an', label: 'AN Plan', type: 'num' },
      { key: 'med', label: 'Med Plan', type: 'num' },
      { key: 'ipt_order', label: 'IPT Order', type: 'num' },
      { key: 'opi_item', label: 'รายการยา', type: 'num' },
      { key: 'confirm', label: 'Confirm', type: 'num' },
    ],
    sql: `SELECT officer.officer_login_name, officer.officer_name,
  (SELECT count(distinct m1.an) FROM medplan_ipd m1 WHERE m1.update_datetime::DATE = '{dateFrom}' AND m1.staff = officer.officer_login_name) as med_an,
  (SELECT count(distinct m1.med_plan_number) FROM medplan_ipd m1 WHERE m1.update_datetime::DATE = '{dateFrom}' AND m1.staff = officer.officer_login_name) as med,
  count(distinct ipt_order_no.order_no) as ipt_order,
  count(distinct case when medication_count > 0 then ipt_order_no.order_no end) as opi_item,
  count(distinct case when confirm_pay = 'Y' then ipt_order_no.order_no end) as confirm
FROM ipt_order_no
INNER JOIN officer ON officer.officer_login_name = ipt_order_no.entry_staff
WHERE ipt_order_no.rxdate = '{dateFrom}'
  AND UPPER(officer.officer_name) NOT LIKE '%BMS%'
  AND medication_count > 0
GROUP BY officer.officer_login_name, officer.officer_name, officer.officer_doctor_code`
  },
  {
    id: 'exam-room',
    name: 'Exam Room',
    nameTh: 'ระบบงานห้องตรวจ',
    icon: '&#129658;',
    columns: [
      { key: 'officer_login_name', label: 'Login' },
      { key: 'officer_name', label: 'ชื่อ-นามสกุล' },
      { key: 'cc_er', label: 'ER', type: 'num' },
      { key: 'cc_bp', label: 'Vital Sign', type: 'num' },
      { key: 'cc_cc', label: 'CC', type: 'num' },
      { key: 'cc_hpi', label: 'HPI', type: 'num' },
      { key: 'cc_dx', label: 'Diag', type: 'num' },
      { key: 'cc_dxtext', label: 'DiagText', type: 'num' },
      { key: 'cc_pe', label: 'PE', type: 'num' },
      { key: 'cc_oper_opd', label: 'หัตถการ', type: 'num' },
      { key: 'cc_lab', label: 'LAB', type: 'num' },
      { key: 'cc_xray', label: 'X-Ray', type: 'num' },
      { key: 'cc_drug', label: 'ยา', type: 'num' },
      { key: 'cc_nondrug', label: 'Non-Drug', type: 'num' },
      { key: 'cc_oapp', label: 'นัด', type: 'num' },
      { key: 'cc_refer', label: 'Refer', type: 'num' },
    ],
    sql: `SELECT officer.officer_id, officer.officer_login_name, officer.officer_name,
  (SELECT count(distinct officer_activity_log_key_value) FROM officer_activity_log WHERE officer_activity_log_table = 'er_regist' AND staff = officer.officer_login_name AND officer_activity_log_date BETWEEN '{dateFrom}' AND '{dateTo}') as cc_er,
  (SELECT count(distinct vn) FROM opdscreen_bp WHERE screen_date BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = officer.officer_login_name) as cc_bp,
  (SELECT count(distinct vn) FROM opdscreen_cc_list WHERE update_datetime::date BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = officer.officer_login_name) as cc_cc,
  (SELECT count(distinct hn) FROM patient_history_hpi WHERE entry_date BETWEEN '{dateFrom}' AND '{dateTo}' AND doctor_code = officer.officer_doctor_code) as cc_hpi,
  (SELECT count(distinct vn) FROM ovstdiag WHERE vstdate BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = officer.officer_login_name) as cc_dx,
  (SELECT count(distinct vn) FROM ovst_doctor_diag WHERE diag_datetime::date BETWEEN '{dateFrom}' AND '{dateTo}' AND doctor_code = officer.officer_doctor_code) as cc_dxtext,
  (SELECT count(distinct vn) FROM opdscreen_doctor_pe WHERE update_datetime::date BETWEEN '{dateFrom}' AND '{dateTo}' AND doctor_code = officer.officer_doctor_code) as cc_pe,
  (SELECT count(*) FROM doctor_operation WHERE update_datetime::date BETWEEN '{dateFrom}' AND '{dateTo}' AND staff = officer.officer_login_name) as cc_oper_opd,
  (SELECT count(distinct vn) FROM lab_head WHERE order_date BETWEEN '{dateFrom}' AND '{dateTo}' AND order_staff = officer.officer_login_name) as cc_lab,
  (SELECT count(distinct vn) FROM xray_report WHERE request_date BETWEEN '{dateFrom}' AND '{dateTo}' AND request_staff = officer.officer_login_name) as cc_xray,
  (SELECT count(*) FROM opitemrece WHERE rxdate BETWEEN '{dateFrom}' AND '{dateTo}' AND icode LIKE '1%' AND staff = officer.officer_login_name) as cc_drug,
  (SELECT count(*) FROM opitemrece WHERE rxdate BETWEEN '{dateFrom}' AND '{dateTo}' AND icode NOT LIKE '1%' AND staff = officer.officer_login_name) as cc_nondrug,
  (SELECT count(*) FROM oapp WHERE vstdate BETWEEN '{dateFrom}' AND '{dateTo}' AND app_user = officer.officer_login_name) as cc_oapp,
  (SELECT count(*) FROM referout WHERE update_datetime::date BETWEEN '{dateFrom}' AND '{dateTo}' AND refer_write_staff = officer.officer_login_name) as cc_refer
FROM officer
INNER JOIN officer_group_list ON officer_group_list.officer_id = officer.officer_id
INNER JOIN officer_group ON officer_group_list.officer_group_id = officer_group.officer_group_id
WHERE upper(officer.officer_name) NOT LIKE '%BMS%'
  AND officer.officer_active = 'Y'
GROUP BY officer.officer_id, officer.officer_login_name, officer.officer_doctor_code, officer.officer_name`
  },
  {
    id: 'operating-room',
    name: 'Operating Room',
    nameTh: 'ระบบงานห้องผ่าตัด',
    icon: '&#129656;',
    columns: [
      { key: 'staff', label: 'Login' },
      { key: 'officer_name', label: 'ชื่อ-นามสกุล' },
      { key: 'operation_list', label: 'รายการผ่าตัด', type: 'num' },
      { key: 'operation_team', label: 'ทีมผ่าตัด', type: 'num' },
      { key: 'operation_specimen', label: 'ชิ้นเนื้อ', type: 'num' },
      { key: 'operation_visit_list', label: 'Visit List', type: 'num' },
      { key: 'opitemrece', label: 'สั่งยา', type: 'num' },
    ],
    sql: `SELECT l.staff, f.officer_name,
  COUNT(DISTINCT CASE WHEN l.officer_activity_log_table = 'operation_list' THEN l.officer_activity_log_key_value END) AS operation_list,
  COUNT(DISTINCT CASE WHEN l.officer_activity_log_table = 'operation_team' THEN l.officer_activity_log_key_value END) AS operation_team,
  COUNT(DISTINCT CASE WHEN l.officer_activity_log_table = 'operation_specimen' THEN l.officer_activity_log_key_value END) AS operation_specimen,
  COUNT(DISTINCT CASE WHEN l.officer_activity_log_table = 'operation_visit_list' THEN l.officer_activity_log_key_value END) AS operation_visit_list,
  COUNT(DISTINCT CASE WHEN l.officer_activity_log_table = 'opitemrece' THEN l.officer_activity_log_key_value END) AS opitemrece
FROM officer_activity_log l
LEFT JOIN officer f ON l.staff = f.officer_login_name
LEFT JOIN kskdepartment k ON k.depcode = l.depcode
WHERE l.officer_activity_log_operation LIKE '%Add%'
  AND l.officer_activity_log_date BETWEEN '{dateFrom}' AND '{dateTo}'
  AND k.department LIKE '%ผ่า%'
  AND f.officer_name NOT LIKE '%BMS%'
GROUP BY l.staff, f.officer_name`
  },
];

// Read template
const templatePath = path.join(__dirname, 'bms-lab-workshop.html');
const template = fs.readFileSync(templatePath, 'utf-8');

// Extract the reusable parts from the template
function generateHtml(ws) {
  const numCols = ws.columns.filter(c => c.type === 'num');
  const summaryCards = numCols.slice(0, 5).map((c, i) => {
    const colors = ['accent', 'teal', 'purple', 'orange', 'pink'];
    const icons = ['&#128203;', '&#129514;', '&#128200;', '&#128736;', '&#128202;'];
    return `<div class="summary-card"><div class="val-row"><span class="card-emoji">${icons[i % icons.length]}</span><div class="val" style="color:var(--${colors[i % colors.length]})" id="sum_${c.key}">0</div></div><div class="label">${escHtml(c.label)}</div></div>`;
  }).join('\n      ');

  const colDefs = JSON.stringify(ws.columns);
  const sqlEscaped = ws.sql.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Workshop - ${ws.name}</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>
  :root{--bg:#0d1117;--surface:#161b22;--surface2:#1c2128;--border:#30363d;--text:#e6edf3;--text-muted:#7d8590;--primary:#1f6feb;--primary-glow:rgba(31,111,235,.15);--success:#3fb950;--success-bg:rgba(63,185,80,.1);--error:#f85149;--error-bg:rgba(248,81,73,.1);--warn:#d29922;--accent:#58a6ff;--teal:#39d353;--purple:#bc8cff;--orange:#ffa657;--pink:#f778ba;--cyan:#79c0ff;--color-scheme:dark}
  [data-theme="light"]{--bg:#f6f8fa;--surface:#ffffff;--surface2:#f0f2f5;--border:#d0d7de;--text:#1f2328;--text-muted:#57606a;--primary:#0969da;--primary-glow:rgba(9,105,218,.1);--success:#1a7f37;--success-bg:rgba(26,127,55,.08);--error:#cf222e;--error-bg:rgba(207,34,46,.08);--warn:#9a6700;--accent:#0550ae;--teal:#1a7f37;--purple:#8250df;--orange:#bc4c00;--pink:#bf3989;--cyan:#0550ae;--color-scheme:light}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Sarabun',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:16px;line-height:1.6;transition:background .3s,color .3s}
  .header{background:var(--surface);border-bottom:1px solid var(--border);padding:0 28px;display:flex;align-items:center;gap:16px;height:68px;position:sticky;top:0;z-index:100}
  .header-logo{display:flex;align-items:center;gap:12px}
  .logo-shield{width:42px;height:42px;background:linear-gradient(135deg,#1f6feb,#58a6ff);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px}
  .header h1{font-size:20px;font-weight:700;letter-spacing:-.3px;white-space:nowrap}
  .header h1 span{color:var(--cyan)}
  .header-subtitle{font-size:13px;color:var(--text-muted);padding:4px 12px;background:var(--surface2);border-radius:6px;max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .header-spacer{flex:1}
  .back-link{font-size:14px;color:var(--accent);text-decoration:none;display:flex;align-items:center;gap:6px;padding:7px 16px;border:1px solid var(--border);border-radius:8px;background:var(--surface2);transition:all .15s}
  .back-link:hover{border-color:var(--accent);text-decoration:none}
  .conn-badge{display:flex;align-items:center;gap:7px;padding:7px 16px;border-radius:20px;font-size:13px;font-weight:700}
  .conn-badge.disconnected{background:var(--surface2);color:var(--text-muted);border:1px solid var(--border)}
  .conn-badge.connected{background:var(--success-bg);color:var(--success);border:1px solid var(--success)}
  .conn-dot{width:9px;height:9px;border-radius:50%;background:currentColor}
  .main{display:flex;height:calc(100vh - 68px)}
  .sidebar{width:360px;min-width:360px;background:var(--surface);border-right:1px solid var(--border);overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:18px}
  .sidebar-section{background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:18px}
  .section-title{font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px;display:flex;align-items:center;gap:6px}
  .field-group{margin-bottom:14px}
  .field-label{font-size:13px;color:var(--text-muted);margin-bottom:5px}
  .field-input{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 14px;color:var(--text);font-size:15px;font-family:'JetBrains Mono',monospace}
  .field-input:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-glow)}
  .field-input[type="date"]{color-scheme:var(--color-scheme)}
  .status-row{display:flex;align-items:center;gap:8px;font-size:13px;margin-top:8px}
  .status-dot{width:9px;height:9px;border-radius:50%;background:var(--text-muted)}
  .status-dot.ok{background:var(--success)}.status-dot.err{background:var(--error)}
  .btn{width:100%;padding:11px 16px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-size:15px;font-weight:600;cursor:pointer;transition:all .15s}
  .btn:hover{border-color:var(--primary);background:var(--primary-glow)}.btn:disabled{opacity:.5;cursor:not-allowed}
  .btn.connected{background:var(--error-bg);border-color:var(--error);color:var(--error)}
  .btn-primary{background:var(--primary);border-color:var(--primary);color:#fff;font-size:16px;padding:12px 16px}
  .btn-primary:hover{background:#388bfd}.btn-primary:disabled{opacity:.5;cursor:not-allowed}
  .date-row{display:flex;gap:10px;align-items:flex-end}.date-row .field-group{flex:1;margin-bottom:0}
  .content{flex:1;overflow:hidden;display:flex;flex-direction:column}
  .summary-row{display:flex;gap:12px;padding:18px 24px;border-bottom:1px solid var(--border);background:var(--surface);flex-shrink:0;flex-wrap:wrap}
  .summary-card{flex:1;min-width:110px;background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:18px 12px 14px;text-align:center;position:relative}
  .summary-card .val-row{display:flex;align-items:center;justify-content:center;gap:8px}
  .summary-card .card-emoji{font-size:28px;line-height:1}
  .summary-card .val{font-size:36px;font-weight:700;font-family:'JetBrains Mono',monospace;line-height:1.1}
  .summary-card .label{font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.3px;margin-top:4px}
  .toolbar{background:var(--surface);border-bottom:1px solid var(--border);padding:12px 24px;display:flex;align-items:center;gap:14px;flex-shrink:0}
  .toolbar-info{display:flex;align-items:center;gap:10px;font-size:15px;color:var(--text-muted)}
  .toolbar-spacer{flex:1}
  .toolbar-btn{padding:7px 18px;border:1px solid var(--border);border-radius:8px;background:var(--surface2);color:var(--text-muted);font-size:14px;cursor:pointer;transition:all .15s}
  .toolbar-btn:hover{color:var(--text);border-color:var(--accent)}
  .count-badge{background:var(--primary);color:#fff;font-size:14px;font-weight:700;padding:3px 12px;border-radius:10px}
  .elapsed-badge{font-size:13px;color:var(--text-muted);font-family:'JetBrains Mono',monospace}
  .tabs{display:flex;border-bottom:1px solid var(--border);background:var(--surface);flex-shrink:0}
  .tab-btn{padding:12px 24px;border:none;background:none;color:var(--text-muted);font-size:15px;font-weight:600;cursor:pointer;border-bottom:3px solid transparent;transition:all .15s}
  .tab-btn:hover{color:var(--text)}.tab-btn.active{color:var(--accent);border-bottom-color:var(--accent)}
  .tab-content{flex:1;overflow:auto;display:none}.tab-content.active{display:block}
  .table-wrap{overflow:auto;height:100%}
  .result-table{width:100%;border-collapse:collapse;font-size:15px;font-family:'JetBrains Mono',monospace}
  .result-table thead{position:sticky;top:0;z-index:10}
  .result-table th{background:var(--surface);color:var(--accent);font-size:14px;font-weight:700;text-align:left;padding:12px 16px;border-bottom:2px solid var(--border);white-space:nowrap;letter-spacing:.3px}
  .result-table td{padding:10px 16px;border-bottom:1px solid var(--border);max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px}
  .result-table tr:hover td{background:var(--surface2)}
  .result-table tfoot td{background:var(--surface2);font-weight:700;border-top:2px solid var(--border);font-size:15px}
  .null-val{color:var(--text-muted);font-style:italic}.num-val{color:var(--teal);font-weight:700;font-size:16px}
  .sql-wrap{display:flex;flex-direction:column;height:100%}
  .sql-toolbar{display:flex;align-items:center;gap:12px;padding:12px 24px;background:var(--surface);border-bottom:1px solid var(--border);flex-shrink:0}
  .sql-status{font-size:13px;font-family:'JetBrains Mono',monospace;color:var(--text-muted)}
  .sql-status.modified{color:var(--warn)}.sql-status.saved{color:var(--success)}
  .sql-editor{flex:1;width:100%;background:var(--bg);color:var(--text);border:none;padding:24px;font-family:'JetBrains Mono',monospace;font-size:15px;line-height:1.8;resize:none;outline:none;tab-size:2}
  .sql-editor:focus{box-shadow:inset 0 0 0 1px var(--primary)}
  .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:56px;text-align:center}
  .empty-icon{width:88px;height:88px;background:var(--surface2);border:1px solid var(--border);border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:42px;color:var(--cyan);margin-bottom:20px}
  .empty-title{font-size:22px;font-weight:700;margin-bottom:8px}
  .empty-sub{font-size:16px;color:var(--text-muted);line-height:1.8}
  .error-view{padding:40px;text-align:center}
  .error-code{font-size:18px;color:var(--error);font-weight:700;margin-bottom:8px}
  .error-msg{font-size:15px;color:var(--text-muted);white-space:pre-wrap}
  .spinner{display:inline-block;animation:spin 1s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .toast-wrap{position:fixed;bottom:20px;right:20px;z-index:1000;display:flex;flex-direction:column;gap:8px}
  .toast{padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;animation:slideIn .3s ease;max-width:420px}
  .toast.ok{background:var(--success-bg);color:var(--success);border:1px solid var(--success)}
  .toast.err{background:var(--error-bg);color:var(--error);border:1px solid var(--error)}
  .toast.info{background:var(--surface2);color:var(--text-muted);border:1px solid var(--border)}
  @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
  .settings-toggle{padding:6px 14px;border:1px solid var(--border);border-radius:8px;background:var(--surface2);color:var(--text-muted);font-size:14px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .15s}
  .settings-toggle:hover{border-color:var(--accent);color:var(--text)}
  .settings-toggle.active{border-color:var(--primary);color:var(--accent);background:var(--primary-glow)}
  .sidebar-section.collapsible{display:none}.sidebar-section.collapsible.open{display:block}
  .theme-btn{padding:6px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface2);color:var(--text-muted);font-size:16px;cursor:pointer;transition:all .15s;line-height:1;display:flex;align-items:center;gap:5px}
  .theme-btn:hover{border-color:var(--accent);color:var(--accent)}
  .theme-btn .lbl{font-size:12px;font-family:'Sarabun',sans-serif}
  .header,.sidebar,.sidebar-section,.content,.toolbar,.tabs,.summary-row,.summary-card,.field-input,.btn,.settings-toggle,.sql-editor,.sql-toolbar,.toast,.empty-icon,.result-table th,.result-table td,.result-table tfoot td{transition:background .3s,border-color .3s,color .3s}
  @media(max-width:900px){.main{flex-direction:column}.sidebar{width:100%;min-width:auto;max-height:300px;border-right:none;border-bottom:1px solid var(--border)}}
</style>
</head>
<body>
<div class="header">
  <div class="header-logo"><div class="logo-shield">${ws.icon}</div><h1>${escHtml(ws.name)} <span>Workshop</span></h1></div>
  <span class="header-subtitle">สรุปการทำ Work Shop - ${escHtml(ws.nameTh)}</span>
  <div class="header-spacer"></div>
  <a class="back-link" href="index_workshop.html">&larr; Workshop Hub</a>
  <button class="theme-btn" id="themeBtn" onclick="toggleTheme()"><span id="themeIcon">&#9790;</span><span class="lbl" id="themeLbl">Dark</span></button>
  <button class="settings-toggle" id="settingsBtn" onclick="toggleSettings()">&#9881; ตั้งค่า</button>
  <div class="conn-badge disconnected" id="connBadge"><div class="conn-dot"></div><span id="connText">Not Connected</span></div>
</div>
<div class="main">
  <div class="sidebar">
    <div class="sidebar-section collapsible" id="sectionSession">
      <div class="section-title">&#128273; BMS Session</div>
      <div class="field-group"><div class="field-label">Session ID (GUID)</div><input type="text" class="field-input" id="sessionId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"></div>
      <div class="status-row"><div class="status-dot" id="sessionDot"></div><span id="sessionStatusTxt" style="color:var(--text-muted)">No Session ID</span></div>
      <div id="sessionUserInfo" style="display:none;margin-top:8px;font-size:12px"></div>
      <button class="btn" id="connectBtn" onclick="handleConnect()" style="margin-top:10px">Connect Session</button>
    </div>
    <div class="sidebar-section">
      <div class="section-title">&#128197; Date Filter</div>
      <div class="date-row"><div class="field-group"><div class="field-label">จากวันที่</div><input type="date" class="field-input" id="dateFrom"></div><div class="field-group"><div class="field-label">ถึงวันที่</div><input type="date" class="field-input" id="dateTo"></div></div>
      <div style="display:flex;gap:4px;margin-top:8px"><button class="toolbar-btn" style="flex:1" onclick="setDatePreset('today')">วันนี้</button><button class="toolbar-btn" style="flex:1" onclick="setDatePreset('yesterday')">เมื่อวาน</button><button class="toolbar-btn" style="flex:1" onclick="setDatePreset('week')">7 วัน</button><button class="toolbar-btn" style="flex:1" onclick="setDatePreset('month')">30 วัน</button></div>
    </div>
    <div class="sidebar-section"><button class="btn btn-primary" id="runBtn" onclick="runQuery()" disabled><span id="runBtnText">Query Data</span></button></div>
  </div>
  <div class="content">
    <div class="summary-row" id="summaryRow" style="display:none">
      <div class="summary-card"><div class="val-row"><span class="card-emoji">&#128101;</span><div class="val" style="color:var(--accent)" id="sumStaff">0</div></div><div class="label">Staff</div></div>
      ${summaryCards}
    </div>
    <div class="toolbar" id="resultToolbar" style="display:none">
      <div class="toolbar-info"><span>Rows:</span><span class="count-badge" id="rowCount">0</span><span class="elapsed-badge" id="elapsedTime"></span></div>
      <div class="toolbar-spacer"></div>
      <button class="toolbar-btn" onclick="exportCsv()">Export CSV</button>
      <button class="toolbar-btn" onclick="copySql()">Copy SQL</button>
    </div>
    <div class="tabs">
      <button class="tab-btn active" onclick="showTab('table',this)">&#128202; Table</button>
      <button class="tab-btn" onclick="showTab('sql',this)">&#128190; SQL Source</button>
    </div>
    <div class="tab-content active" id="tab-table">
      <div class="empty-state" id="emptyState"><div class="empty-icon">${ws.icon}</div><div class="empty-title">${escHtml(ws.name)} Workshop</div><div class="empty-sub">สรุปการทำ Work Shop - ${escHtml(ws.nameTh)}<br><br>1. กรอก BMS Session ID แล้วกด Connect<br>2. เลือกช่วงวันที่<br>3. กดปุ่ม Query Data</div></div>
      <div class="table-wrap" id="tableWrap" style="display:none"></div>
    </div>
    <div class="tab-content" id="tab-sql">
      <div class="sql-wrap">
        <div class="sql-toolbar"><span style="font-size:11px;font-weight:700;color:var(--text-muted)">SQL EDITOR</span><span class="sql-status" id="sqlStatus">default</span><div class="toolbar-spacer"></div><button class="toolbar-btn" id="sqlSaveBtn" onclick="saveSql()" style="display:none">Save (Ctrl+S)</button><button class="toolbar-btn" id="sqlResetBtn" onclick="resetSql()" style="display:none">Reset Default</button><button class="toolbar-btn" onclick="copySql()">Copy SQL</button></div>
        <textarea class="sql-editor" id="sqlEditor" spellcheck="false"></textarea>
      </div>
    </div>
  </div>
</div>
<div class="toast-wrap" id="toastWrap"></div>
<script>
const SESSION_COOKIE_NAME='bms-session-id',SESSION_COOKIE_DAYS=7,SESSION_URL_PARAM='bms-session-id',DEFAULT_TIMEOUT=60000,APP_NAME='BMS.Workshop.${ws.id}';
const COLUMNS=${colDefs};
const LS_CUSTOM_SQL='ws-${ws.id}-custom-sql';
let sessionConnected=false,sessionData=null,connectionConfig=null,userInfo=null,lastData=[],customSql=null,sqlModified=false;
function escHtml(s){if(s==null)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function todayStr(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function minifySql(s){return s.replace(/--.*$/gm,'').replace(/\\/\\*[\\s\\S]*?\\*\\//g,'').replace(/\\s+/g,' ').trim()}
function setSessionCookie(id){const e=new Date(Date.now()+SESSION_COOKIE_DAYS*864e5).toUTCString();const s=location.protocol==='https:'?'; Secure':'';document.cookie=SESSION_COOKIE_NAME+'='+encodeURIComponent(id)+'; expires='+e+'; path=/'+s+'; SameSite=Lax'}
function getSessionCookie(){const m=document.cookie.match(new RegExp('(?:^|; )'+SESSION_COOKIE_NAME+'=([^;]*)'));return m?decodeURIComponent(m[1]):null}
function removeSessionCookie(){document.cookie=SESSION_COOKIE_NAME+'=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'}
function getSessionFromUrl(){const p=new URLSearchParams(window.location.search);const s=p.get(SESSION_URL_PARAM);return s&&s.trim()?s.trim():null}
function removeSessionFromUrl(){const u=new URL(window.location.href);if(u.searchParams.has(SESSION_URL_PARAM)){u.searchParams.delete(SESSION_URL_PARAM);window.history.replaceState({},'',u.toString())}}
async function validateSession(sid){try{const u='https://hosxp.net/phapi/PasteJSON?Action=GET&code='+encodeURIComponent(sid);const c=new AbortController();const t=setTimeout(()=>c.abort(),10000);const r=await fetch(u,{method:'GET',headers:{'Content-Type':'application/json','Accept':'application/json'},signal:c.signal,mode:'cors'});clearTimeout(t);if(!r.ok)return{MessageCode:r.status,Message:'HTTP '+r.status};return await r.json()}catch(e){return{MessageCode:0,Message:e.name==='AbortError'?'Timeout':'Connection Error'}}}
function extractConnectionConfig(d){const r=d.result||{},ui=r.user_info||{};let a,k;if(r.key_value&&typeof r.key_value==='object'){a=r.key_value['hosxp.api_url'];k=r.key_value['hosxp.api_auth_key']}if(!a)a=ui['hosxp.api_url'];if(!k)k=ui['hosxp.api_auth_key'];if(!a)a=ui.bms_url;if(!k)k=ui.bms_session_code;if(!k&&typeof r.key_value==='string')k=r.key_value;return{apiUrl:(a||'').replace(/\\/$/,''),apiAuthKey:k||''}}
async function handleConnect(){if(sessionConnected){disconnectSession();return}const sid=document.getElementById('sessionId').value.trim();if(!sid){showToast('err','กรุณาระบุ BMS Session ID');return}const btn=document.getElementById('connectBtn');btn.disabled=true;btn.textContent='Connecting...';sessionData=await validateSession(sid);btn.disabled=false;if(!sessionData||sessionData.MessageCode!==200){showToast('err',sessionData?.Message||'Failed');btn.textContent='Connect Session';sessionData=null;return}connectionConfig=extractConnectionConfig(sessionData);userInfo=sessionData.result?.user_info||{};if(!connectionConfig.apiUrl){showToast('err','No API URL found');btn.textContent='Connect Session';sessionData=null;connectionConfig=null;return}sessionConnected=true;setSessionCookie(sid);btn.textContent='Disconnect';btn.classList.add('connected');document.getElementById('runBtn').disabled=false;document.getElementById('connBadge').className='conn-badge connected';document.getElementById('connText').textContent=userInfo.name||'Connected';const info=document.getElementById('sessionUserInfo');info.style.display='block';info.innerHTML='<span style="color:var(--success)">'+escHtml(userInfo.name||'')+'</span> <span style="color:var(--text-muted);margin-left:6px">'+escHtml(userInfo.location||'')+'</span>';document.getElementById('sessionDot').className='status-dot ok';document.getElementById('sessionStatusTxt').textContent='Session Active';document.getElementById('sessionStatusTxt').style.color='var(--success)';showToast('ok','Connected: '+(userInfo.name||'OK'))}
function disconnectSession(){sessionConnected=false;sessionData=null;connectionConfig=null;userInfo=null;removeSessionCookie();document.getElementById('connectBtn').textContent='Connect Session';document.getElementById('connectBtn').classList.remove('connected');document.getElementById('runBtn').disabled=true;document.getElementById('connBadge').className='conn-badge disconnected';document.getElementById('connText').textContent='Not Connected';document.getElementById('sessionUserInfo').style.display='none';document.getElementById('sessionDot').className='status-dot';document.getElementById('sessionStatusTxt').textContent='No Session ID';document.getElementById('sessionStatusTxt').style.color='var(--text-muted)';showToast('info','Disconnected')}
function updateSessionStatus(){const v=document.getElementById('sessionId').value.trim();const d=document.getElementById('sessionDot');const t=document.getElementById('sessionStatusTxt');const g=/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;if(!v){d.className='status-dot';t.textContent='No Session ID';t.style.color='var(--text-muted)'}else if(g.test(v)){d.className='status-dot ok';t.textContent='Valid GUID';t.style.color='var(--success)'}else{d.className='status-dot err';t.textContent='Invalid format';t.style.color='var(--error)'}}
function setDatePreset(p){const n=new Date();let f=new Date(),t=new Date();if(p==='yesterday'){f.setDate(n.getDate()-1);t.setDate(n.getDate()-1)}else if(p==='week')f.setDate(n.getDate()-6);else if(p==='month')f.setDate(n.getDate()-29);document.getElementById('dateFrom').value=fmtD(f);document.getElementById('dateTo').value=fmtD(t);if(customSql===null)updateSqlEditor()}
function fmtD(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function buildDefaultSql(){const df=document.getElementById('dateFrom').value||todayStr();const dt=document.getElementById('dateTo').value||todayStr();return \`${sqlEscaped}\`.replace(/\\{dateFrom\\}/g,df).replace(/\\{dateTo\\}/g,dt)}
function buildSql(){if(customSql!==null){const df=document.getElementById('dateFrom').value||todayStr();const dt=document.getElementById('dateTo').value||todayStr();return customSql.replace(/\\{dateFrom\\}/g,df).replace(/\\{dateTo\\}/g,dt)}return buildDefaultSql()}
function updateSqlEditor(){const e=document.getElementById('sqlEditor');if(!e)return;e.value=customSql!==null?customSql:buildDefaultSql();updateSqlStatus()}
function updateSqlStatus(){const s=document.getElementById('sqlStatus'),sb=document.getElementById('sqlSaveBtn'),rb=document.getElementById('sqlResetBtn');if(customSql!==null){s.textContent=sqlModified?'modified (unsaved)':'custom (saved)';s.className='sql-status '+(sqlModified?'modified':'saved');sb.style.display=sqlModified?'':'none';rb.style.display=''}else if(sqlModified){s.textContent='modified (unsaved)';s.className='sql-status modified';sb.style.display='';rb.style.display=''}else{s.textContent='default';s.className='sql-status';sb.style.display='none';rb.style.display='none'}}
function onSqlEditorInput(){const c=document.getElementById('sqlEditor').value;const d=buildDefaultSql();sqlModified=customSql!==null?c!==customSql:c!==d;updateSqlStatus()}
function saveSql(){const s=document.getElementById('sqlEditor').value.trim();if(!s){showToast('err','SQL ว่าง');return}if(s===buildDefaultSql()){customSql=null;localStorage.removeItem(LS_CUSTOM_SQL)}else{customSql=s;localStorage.setItem(LS_CUSTOM_SQL,s)}sqlModified=false;updateSqlStatus();showToast('ok','SQL saved')}
function resetSql(){customSql=null;sqlModified=false;localStorage.removeItem(LS_CUSTOM_SQL);updateSqlEditor();updateSqlStatus();showToast('info','SQL reset')}
function loadCustomSql(){const s=localStorage.getItem(LS_CUSTOM_SQL);if(s)customSql=s}
async function runQuery(){if(!sessionConnected){showToast('err','กรุณา Connect Session ก่อน');return}const btn=document.getElementById('runBtn'),bt=document.getElementById('runBtnText');btn.disabled=true;bt.innerHTML='<span class="spinner">&#8635;</span> Querying...';const sql=buildSql(),url=connectionConfig.apiUrl+'/api/sql?sql='+encodeURIComponent(minifySql(sql))+'&app='+encodeURIComponent(APP_NAME);const st=Date.now();let res;try{const c=new AbortController();const t=setTimeout(()=>c.abort(),DEFAULT_TIMEOUT);const r=await fetch(url,{method:'GET',headers:{'Authorization':'Bearer '+connectionConfig.apiAuthKey,'Content-Type':'application/json'},signal:c.signal});clearTimeout(t);res=await r.json();if(r.status===401)res={MessageCode:401,Message:'Unauthorized'};else if(r.status===502)res={MessageCode:502,Message:'Bad Gateway'};else if(r.status===500)res={MessageCode:500,Message:'Session Expired'}}catch(e){res={MessageCode:0,Message:e.name==='AbortError'?'Timeout':e.message}}const el=Date.now()-st;btn.disabled=false;bt.textContent='Query Data';if(res.MessageCode!==200){showToast('err','Error '+res.MessageCode+': '+res.Message);document.getElementById('emptyState').style.display='none';document.getElementById('tableWrap').style.display='block';document.getElementById('tableWrap').innerHTML='<div class="error-view"><div class="error-code">Error '+res.MessageCode+'</div><div class="error-msg">'+escHtml(res.Message)+'</div></div>';document.getElementById('resultToolbar').style.display='flex';document.getElementById('summaryRow').style.display='none';document.getElementById('rowCount').textContent='!';document.getElementById('elapsedTime').textContent=el+'ms';return}lastData=res.data||res.result?.data||[];if(!Array.isArray(lastData))lastData=[];document.getElementById('emptyState').style.display='none';document.getElementById('resultToolbar').style.display='flex';document.getElementById('summaryRow').style.display='flex';document.getElementById('rowCount').textContent=lastData.length;document.getElementById('elapsedTime').textContent=el+'ms';renderTable(lastData);renderSummary(lastData);showToast('ok','สำเร็จ - '+lastData.length+' เจ้าหน้าที่ ('+el+'ms)')}
function renderTable(data){const w=document.getElementById('tableWrap');w.style.display='block';w.innerHTML='';if(!data.length){w.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-muted)">ไม่พบข้อมูล</div>';return}const t=document.createElement('table');t.className='result-table';const cols=[{key:'no',label:'No.',type:'no'},...COLUMNS];t.innerHTML='<thead><tr>'+cols.map(c=>'<th style="'+(c.type==='num'||c.type==='no'?'text-align:center':'')+'">'+escHtml(c.label)+'</th>').join('')+'</tr></thead>';const tb=document.createElement('tbody');data.forEach((r,i)=>{const tr=document.createElement('tr');cols.forEach(c=>{const td=document.createElement('td');if(c.type==='num'||c.type==='no')td.style.textAlign='center';if(c.type==='no'){td.innerHTML='<span class="num-val">'+(i+1)+'</span>'}else{const v=r[c.key];if(v==null||v==='')td.innerHTML='<span class="null-val">-</span>';else if(c.type==='num')td.innerHTML='<span class="num-val">'+Number(v).toLocaleString()+'</span>';else td.textContent=v}tr.appendChild(td)});tb.appendChild(tr)});t.appendChild(tb);const numCols=COLUMNS.filter(c=>c.type==='num');if(numCols.length){const tf=document.createElement('tfoot');const tr=document.createElement('tr');cols.forEach((c,i)=>{const td=document.createElement('td');if(c.type==='num'||c.type==='no')td.style.textAlign='center';if(c.type==='no')td.textContent='';else if(c.type==='num'){let s=0;data.forEach(r=>s+=Number(r[c.key]||0));td.innerHTML='<span class="num-val">'+s.toLocaleString()+'</span>'}else if(i===1)td.innerHTML='<span style="color:var(--accent);font-weight:700">TOTAL</span>';else if(i===2)td.innerHTML='<span style="color:var(--text-muted)">'+data.length+' คน</span>';else td.textContent='';tr.appendChild(td)});tf.appendChild(tr);t.appendChild(tf)}w.appendChild(t)}
function renderSummary(data){document.getElementById('sumStaff').textContent=data.length;const numCols=COLUMNS.filter(c=>c.type==='num');numCols.slice(0,5).forEach(c=>{const el=document.getElementById('sum_'+c.key);if(el){let s=0;data.forEach(r=>s+=Number(r[c.key]||0));el.textContent=s.toLocaleString()}})}
function showTab(n,el){document.querySelectorAll('.tab-btn').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));el.classList.add('active');document.getElementById('tab-'+n).classList.add('active')}
function exportCsv(){if(!lastData.length){showToast('err','ไม่มีข้อมูล');return}const cols=COLUMNS;let csv=cols.map(c=>'"'+c.label+'"').join(',')+String.fromCharCode(10);lastData.forEach(r=>{csv+=cols.map(c=>{let v=r[c.key];if(v==null)return'';return'"'+String(v).replace(/"/g,'""')+'"'}).join(',')+String.fromCharCode(10)});const b=new Blob([String.fromCharCode(0xFEFF)+csv],{type:'text/csv;charset=utf-8'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='workshop-${ws.id}-'+(document.getElementById('dateFrom').value||todayStr())+'.csv';a.click();URL.revokeObjectURL(u);showToast('ok','Export CSV สำเร็จ')}
function copySql(){const s=document.getElementById('sqlEditor').value||buildSql();navigator.clipboard.writeText(s).then(()=>showToast('ok','Copied')).catch(()=>{const t=document.createElement('textarea');t.value=s;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);showToast('ok','Copied')})}
function showToast(t,m){const w=document.getElementById('toastWrap'),d=document.createElement('div');d.className='toast '+t;d.textContent=m;w.appendChild(d);setTimeout(()=>d.remove(),4000)}
let settingsOpen=false;function toggleSettings(){settingsOpen=!settingsOpen;document.getElementById('settingsBtn').classList.toggle('active',settingsOpen);document.getElementById('sectionSession').classList.toggle('open',settingsOpen)}
function toggleTheme(){const h=document.documentElement;setTheme(h.getAttribute('data-theme')==='light'?'dark':'light')}
function setTheme(t){document.documentElement.setAttribute('data-theme',t);localStorage.setItem('ws-theme',t);document.getElementById('themeIcon').innerHTML=t==='light'?'\\u2604':'\\u263E';document.getElementById('themeLbl').textContent=t==='light'?'Light':'Dark'}
(function(){const s=localStorage.getItem('ws-theme');if(s)setTheme(s);else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme:light)').matches)setTheme('light')})();
function init(){const t=todayStr();document.getElementById('dateFrom').value=t;document.getElementById('dateTo').value=t;loadCustomSql();document.getElementById('sessionId').addEventListener('input',updateSessionStatus);document.getElementById('dateFrom').addEventListener('change',()=>{if(customSql===null)updateSqlEditor()});document.getElementById('dateTo').addEventListener('change',()=>{if(customSql===null)updateSqlEditor()});const se=document.getElementById('sqlEditor');se.addEventListener('input',onSqlEditorInput);se.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();saveSql()}if(e.key==='Tab'){e.preventDefault();const s=se.selectionStart,en=se.selectionEnd;se.value=se.value.substring(0,s)+'  '+se.value.substring(en);se.selectionStart=se.selectionEnd=s+2;onSqlEditorInput()}});updateSqlEditor();const us=getSessionFromUrl();if(us){document.getElementById('sessionId').value=us;updateSessionStatus();setSessionCookie(us);removeSessionFromUrl();handleConnect();return}const cs=getSessionCookie();if(cs){document.getElementById('sessionId').value=cs;updateSessionStatus();handleConnect()}}
init();
</script>
</body>
</html>`;
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Generate all dashboard files
const outDir = __dirname;
const generated = [];

for (const ws of workshops) {
  const filename = `bms-ws-${ws.id}.html`;
  const filepath = path.join(outDir, filename);
  const html = generateHtml(ws);
  fs.writeFileSync(filepath, html, 'utf-8');
  generated.push({ id: ws.id, name: ws.name, nameTh: ws.nameTh, icon: ws.icon, filename });
  console.log(`Generated: ${filename}`);
}

// Generate index_workshop.html cards
console.log('\n=== Cards for index_workshop.html ===\n');
const colors = ['blue', 'green', 'purple', 'pink', 'blue', 'green', 'purple', 'pink'];
generated.forEach((ws, i) => {
  const color = colors[i % colors.length];
  console.log(`    <a class="card ${color}" href="#" onclick="openDashboard('${ws.filename}', event)">
      <div class="card-header"><div class="card-icon">${ws.icon}</div><div><div class="card-title">${ws.name} Workshop</div><span class="card-version">v1.0</span></div></div>
      <div class="card-desc">สรุปการทำ Work Shop - ${ws.nameTh}</div>
      <div class="card-tags"><span class="card-tag">Workshop</span><span class="card-tag">${ws.name}</span></div>
      <div class="card-footer"><span class="card-method get">GET</span><span class="card-open">Open &rarr;</span></div>
    </a>\n`);
});

console.log(`\nTotal: ${generated.length} files generated`);
