// ============ SUPABASE CONFIG ============
// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';

let supabaseClient = null;

try {
  if (window.supabase && SUPABASE_URL && SUPABASE_URL.indexOf('YOUR-PROJECT') === -1) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn('Supabase init failed — running in offline/demo mode');
}

const DB = {
  ready: () => supabaseClient !== null,

  async select(table, columns = '*', filters = {}, options = {}) {
    if (!DB.ready()) return demoFallback(table, filters);
    try {
      let q = supabaseClient.from(table).select(columns);
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined && v !== null && v !== '') {
          q = q.eq(k, v);
        }
      }
      if (options.orderBy) q = q.order(options.orderBy, { ascending: options.ascending !== false });
      if (options.limit) q = q.limit(options.limit);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('DB.select error:', e.message);
      return demoFallback(table, filters);
    }
  },

  async insert(table, row) {
    if (!DB.ready()) {
      // queue for offline
      if (window.OfflineQueue) await window.OfflineQueue.enqueue({ table, op: 'insert', payload: row });
      return row;
    }
    try {
      const { data, error } = await supabaseClient.from(table).insert(row).select();
      if (error) throw error;
      logAudit('insert', table, data && data[0] && data[0].id);
      return data && data[0];
    } catch (e) {
      console.error('DB.insert error:', e.message);
      if (window.OfflineQueue) await window.OfflineQueue.enqueue({ table, op: 'insert', payload: row });
      showToast('error', t('err.savefailed'), t('err.savedoffline'));
      return row;
    }
  },

  async update(table, id, updates) {
    if (!DB.ready()) return null;
    try {
      const { data, error } = await supabaseClient.from(table).update(updates).eq('id', id).select();
      if (error) throw error;
      logAudit('update', table, id);
      return data && data[0];
    } catch (e) {
      console.error('DB.update error:', e.message);
      showToast('error', t('err.updatefailed'), e.message);
      return null;
    }
  },

  async rpc(fn, params) {
    if (!DB.ready()) return null;
    try {
      const { data, error } = await supabaseClient.rpc(fn, params);
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('DB.rpc error:', e.message);
      return null;
    }
  }
};

// ============ DEMO FALLBACK DATA ============
function demoFallback(table, filters) {
  const demo = {
    users: [
      { id: 'u1', name: 'Sunita Devi', mobile: '9000000001', role: 'asha', district: 'Jodhpur', block: 'Osian', village: 'Khejarli', is_active: true, created_at: '2024-08-15' },
      { id: 'u2', name: 'Dr. Rajesh Kumar', mobile: '9000000002', role: 'medical_officer', district: 'Jodhpur', block: 'Phalodi', is_active: true, created_at: '2024-07-01' },
      { id: 'u3', name: 'Meera Sharma', mobile: '9000000003', role: 'asha', district: 'Jaisalmer', block: 'Sam', village: 'Kuldhara', is_active: false, created_at: '2024-09-01' }
    ],
    pregnancies: [
      { id: 'p1', beneficiary_id: 'b1', lmp: '2024-07-15', edd: '2025-04-22', gestational_age_days: 100, trimester: 2, gravida: 2, para: 1, current_risk: 'high', status: 'active', name: 'Geeta Devi' },
      { id: 'p2', beneficiary_id: 'b2', lmp: '2024-09-01', edd: '2025-06-08', gestational_age_days: 50, trimester: 1, gravida: 1, para: 0, current_risk: 'moderate', status: 'active', name: 'Kamlesh Bai' },
      { id: 'p3', beneficiary_id: 'b3', lmp: '2024-05-20', edd: '2025-02-25', gestational_age_days: 155, trimester: 3, gravida: 3, para: 2, current_risk: 'low', status: 'active', name: 'Rukmini Devi' }
    ],
    beneficiaries: [
      { id: 'b1', name: 'Geeta Devi', age: 24, mobile: '9876543210', district: 'Jodhpur', block: 'Osian', village: 'Khejarli' },
      { id: 'b2', name: 'Kamlesh Bai', age: 19, mobile: '9876543211', district: 'Jaisalmer', block: 'Sam', village: 'Kuldhara' },
      { id: 'b3', name: 'Rukmini Devi', age: 28, mobile: '9876543212', district: 'Barmer', block: 'Chohtan', village: 'Dhanau' }
    ],
    referrals: [
      { id: 'r1', pregnancy_id: 'p1', beneficiary_id: 'b1', risk_level: 'high', reason: 'Severe hypertension', status: 'pending', priority: 'urgent', facility_id: 'f1', created_at: '2024-10-20', name: 'Geeta Devi' },
      { id: 'r2', pregnancy_id: 'p2', beneficiary_id: 'b2', risk_level: 'moderate', reason: 'Anaemia', status: 'referred', priority: 'normal', facility_id: 'f2', created_at: '2024-10-18', name: 'Kamlesh Bai' }
    ],
    followups: [
      { id: 'fu1', pregnancy_id: 'p1', beneficiary_id: 'b1', due_date: '2024-10-25', reason: 'BP monitoring', status: 'due', name: 'Geeta Devi' },
      { id: 'fu2', pregnancy_id: 'p3', beneficiary_id: 'b3', due_date: '2024-10-22', reason: 'ANC visit 4', status: 'due', name: 'Rukmini Devi' },
      { id: 'fu3', pregnancy_id: 'p2', beneficiary_id: 'b2', due_date: '2024-10-19', reason: 'Iron supplementation review', status: 'overdue', name: 'Kamlesh Bai' }
    ],
    facilities: [
      { id: 'f1', name: 'PHC Osian', type: 'phc', district: 'Jodhpur', block: 'Osian', obstetric_capability: false, emergency_capability: true, contact: '0291-123456' },
      { id: 'f2', name: 'CHC Phalodi', type: 'chc', district: 'Jodhpur', block: 'Phalodi', obstetric_capability: true, emergency_capability: true, contact: '0291-654321' },
      { id: 'f3', name: 'District Hospital Jodhpur', type: 'district_hospital', district: 'Jodhpur', block: 'Jodhpur', obstetric_capability: true, emergency_capability: true, contact: '0291-999999' },
      { id: 'f4', name: 'AIIMS Jodhpur', type: 'referral', district: 'Jodhpur', block: 'Jodhpur', obstetric_capability: true, emergency_capability: true, contact: '0291-111111' }
    ],
    health_assessments: [],
    risk_assessments: [],
    anc_visits: [],
    children: [],
    immunizations: [],
    audit_logs: [
      { id: 'al1', user_id: 'u1', action: 'Pregnancy Created', entity: 'pregnancies', entity_id: 'p1', created_at: '2024-10-15T10:30:00Z' },
      { id: 'al2', user_id: 'u2', action: 'Referral Created', entity: 'referrals', entity_id: 'r1', created_at: '2024-10-20T14:00:00Z' }
    ],
    risk_rules: [
      { id: 'rr1', rule_name: 'Severe Hypertension', description: 'BP >= 160/110', indicator: 'bp', condition: 'systolic >= 160 OR diastolic >= 110', severity: 'high', enabled: true, ruleset_version: 'v1.0' },
      { id: 'rr2', rule_name: 'Severe Anaemia', description: 'Hb < 7', indicator: 'haemoglobin', condition: 'haemoglobin < 7', severity: 'high', enabled: true, ruleset_version: 'v1.0' },
      { id: 'rr3', rule_name: 'Vaginal Bleeding', description: 'Warning sign', indicator: 'warning_signs', condition: 'contains:bleeding', severity: 'high', enabled: true, ruleset_version: 'v1.0' }
    ]
  };
  let result = demo[table] || [];
  // Apply simple filters
  for (const [k, v] of Object.entries(filters || {})) {
    if (v !== undefined && v !== null && v !== '') {
      result = result.filter(r => String(r[k]) === String(v));
    }
  }
  return result;
}

function logAudit(action, entity, entityId) {
  const user = Auth && Auth.currentUser ? Auth.currentUser.id : null;
  // Fire-and-forget audit log
  if (DB.ready()) {
    supabaseClient.from('audit_logs').insert({
      user_id: user, action, entity, entity_id: entityId
    }).then(() => {}).catch(() => {});
  }
}

window.DB = DB;
window.supabaseClient = supabaseClient;
