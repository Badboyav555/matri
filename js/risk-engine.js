// ============ RISK SCREENING ENGINE ============
// Transparent clinical screening rules (NOT an ML model).
// This is a decision-support prototype only.

const RiskEngine = {
  RULESET_VERSION: 'v1.0',

  // Returns: { level: 'low'|'moderate'|'high', indicators: [], urgent: bool }
  assess(data) {
    const indicators = [];
    let urgent = false;

    // ---- VITALS ----
    const sys = num(data.systolic);
    const dia = num(data.diastolic);
    if (sys && dia) {
      if (sys >= 160 || dia >= 110) {
        indicators.push({ key: 'severe_hypertension', label_en: 'Severe Hypertension', label_hi: 'गंभीर उच्च रक्तचाप', severity: 'high' });
        urgent = true;
      } else if (sys >= 140 || dia >= 90) {
        indicators.push({ key: 'hypertension', label_en: 'Hypertension', label_hi: 'उच्च रक्तचाप', severity: 'high' });
      } else if (sys >= 130 || dia >= 85) {
        indicators.push({ key: 'mild_hypertension', label_en: 'Mild Hypertension', label_hi: 'हल्का उच्च रक्तचाप', severity: 'moderate' });
      }
    }

    const hb = num(data.haemoglobin);
    if (hb) {
      if (hb < 7) indicators.push({ key: 'severe_anaemia', label_en: 'Severe Anaemia', label_hi: 'गंभीर एनीमिया', severity: 'high' });
      else if (hb < 10) indicators.push({ key: 'moderate_anaemia', label_en: 'Moderate Anaemia', label_hi: 'मध्यम एनीमिया', severity: 'moderate' });
      else if (hb < 11) indicators.push({ key: 'mild_anaemia', label_en: 'Mild Anaemia', label_hi: 'हल्का एनीमिया', severity: 'moderate' });
    }

    const temp = num(data.temperature);
    if (temp && temp >= 100.4) {
      indicators.push({ key: 'fever', label_en: 'Fever', label_hi: 'बुखार', severity: 'high' });
      urgent = true;
    }

    const pulse = num(data.pulse);
    if (pulse && (pulse > 110 || pulse < 60)) {
      indicators.push({ key: 'abnormal_pulse', label_en: 'Abnormal Pulse', label_hi: 'असामान्य नाड़ी', severity: 'moderate' });
    }

    const glucose = num(data.blood_glucose);
    if (glucose) {
      if (glucose >= 140) indicators.push({ key: 'high_glucose', label_en: 'High Blood Glucose', label_hi: 'उच्च रक्त शर्करा', severity: 'high' });
      else if (glucose >= 110) indicators.push({ key: 'elevated_glucose', label_en: 'Elevated Blood Glucose', label_hi: 'बढ़ी हुई रक्त शर्करा', severity: 'moderate' });
    }

    // ---- MEDICAL HISTORY ----
    const hist = data.medical_history || [];
    if (hist.includes('hypertension')) indicators.push({ key: 'hist_htn', label_en: 'Hypertension History', label_hi: 'उच्च रक्तचाप इतिहास', severity: 'moderate' });
    if (hist.includes('diabetes')) indicators.push({ key: 'hist_diabetes', label_en: 'Diabetes History', label_hi: 'मधुमेह इतिहास', severity: 'moderate' });
    if (hist.includes('previous_c_section')) indicators.push({ key: 'hist_cs', label_en: 'Previous C-section', label_hi: 'पिछला सी-सेक्शन', severity: 'moderate' });
    if (hist.includes('previous_complication')) indicators.push({ key: 'hist_comp', label_en: 'Previous Pregnancy Complication', label_hi: 'पिछली गर्भावस्था जटिलता', severity: 'moderate' });
    if (hist.includes('previous_stillbirth')) indicators.push({ key: 'hist_sb', label_en: 'Previous Stillbirth', label_hi: 'पिछला मृत जन्म', severity: 'high' });
    if (hist.includes('previous_miscarriage')) indicators.push({ key: 'hist_mc', label_en: 'Previous Miscarriage', label_hi: 'पिछला गर्भपात', severity: 'moderate' });
    if (hist.includes('previous_pph')) indicators.push({ key: 'hist_pph', label_en: 'Previous PPH', label_hi: 'पिछला प्रसवोत्तर रक्तस्राव', severity: 'high' });
    if (hist.includes('multiple_pregnancy')) indicators.push({ key: 'multiple', label_en: 'Multiple Pregnancy', label_hi: 'बहुत गर्भावस्था', severity: 'high' });
    if (hist.includes('anaemia')) indicators.push({ key: 'hist_anaemia', label_en: 'Anaemia History', label_hi: 'एनीमिया इतिहास', severity: 'moderate' });

    // ---- WARNING SIGNS (URGENT) ----
    const signs = data.warning_signs || [];
    const urgentMap = {
      bleeding: { label_en: 'Vaginal Bleeding', label_hi: 'योनि से रक्तस्राव' },
      severe_headache: { label_en: 'Severe Headache', label_hi: 'तीव्र सिरदर्द' },
      vision: { label_en: 'Vision Problems', label_hi: 'दृष्टि समस्याएं' },
      severe_abdominal_pain: { label_en: 'Severe Abdominal Pain', label_hi: 'तीव्र उदर दर्द' },
      fever: { label_en: 'Fever', label_hi: 'बुखार' },
      difficulty_breathing: { label_en: 'Difficulty Breathing', label_hi: 'सांस लेने में कठिनाई' },
      convulsions: { label_en: 'Convulsions', label_hi: 'ऐंठन' },
      reduced_fetal_movement: { label_en: 'Reduced Fetal Movement', label_hi: 'भ्रूण गति में कमी' }
    };
    for (const s of signs) {
      if (urgentMap[s]) {
        indicators.push({ key: 'ws_' + s, label_en: urgentMap[s].label_en, label_hi: urgentMap[s].label_hi, severity: 'high', warning: true });
        urgent = true;
      }
    }
    if (signs.includes('other_concerning')) {
      indicators.push({ key: 'ws_other', label_en: 'Other Concerning Symptom', label_hi: 'अन्य चिंताजनक लक्षण', severity: 'moderate', warning: true });
    }

    // ---- AGE / PARITY ----
    const age = num(data.age);
    if (age && (age < 18 || age > 35)) {
      indicators.push({ key: 'age_risk', label_en: age < 18 ? 'Maternal Age < 18' : 'Maternal Age > 35', label_hi: age < 18 ? 'मातृ आयु 18 वर्ष से कम' : 'मातृ आयु 35 वर्ष से अधिक', severity: 'moderate' });
    }
    const para = num(data.para);
    if (para && para >= 5) {
      indicators.push({ key: 'high_parity', label_en: 'High Parity (≥5)', label_hi: 'उच्च पैरा (≥5)', severity: 'moderate' });
    }

    // ---- DETERMINE LEVEL ----
    // Urgent warning signs ALWAYS override to high
    let level = 'low';
    if (indicators.some(i => i.severity === 'high') || urgent) {
      level = 'high';
    } else if (indicators.some(i => i.severity === 'moderate')) {
      level = 'moderate';
    }

    return {
      level,
      indicators,
      urgent,
      ruleset_version: RiskEngine.RULESET_VERSION,
      assessed_at: new Date().toISOString()
    };
  },

  // Calculate gestational age in days from LMP
  calcGestationalAge(lmpDate) {
    if (!lmpDate) return null;
    const lmp = new Date(lmpDate);
    const now = new Date();
    const diffMs = now - lmp;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  },

  calcEDD(lmpDate) {
    if (!lmpDate) return null;
    const lmp = new Date(lmpDate);
    lmp.setDate(lmp.getDate() + 280); // 40 weeks
    return lmp.toISOString().split('T')[0];
  },

  calcTrimester(days) {
    if (!days) return null;
    if (days < 91) return 1;
    if (days < 182) return 2;
    return 3;
  },

  recommend(level, urgent) {
    if (level === 'high' || urgent) {
      return {
        hi: 'तत्काल चिकित्सकीय समीक्षा और रेफरल आवश्यक। उचित स्तर की सुविधा पर भेजें।',
        en: 'Immediate medical review and referral required. Send to appropriate level facility.'
      };
    }
    if (level === 'moderate') {
      return {
        hi: 'चिकित्सकीय समीक्षा आवश्यक हो सकती है। निकटतम PHC/CHC पर भेजें और नियमित फॉलो-अप सुनिश्चित करें।',
        en: 'Medical review may be required. Send to nearest PHC/CHC and ensure regular follow-up.'
      };
    }
    return {
      hi: 'नियमित ANC जारी रखें। अगली नियोजित जांच पर फॉलो-अप करें।',
      en: 'Continue regular ANC. Follow up at next scheduled visit.'
    };
  }
};

function num(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

window.RiskEngine = RiskEngine;
