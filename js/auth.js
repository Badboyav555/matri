// ============ CUSTOM AUTHENTICATION (SHA-256, NO SALT) ============

const Auth = {
  currentUser: null,

  async hashPassword(password) {
    // SHA-256 only, no salt, as specified
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async login(mobile, password) {
    const hash = await Auth.hashPassword(password);
    // Try Supabase
    if (DB.ready()) {
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('mobile', mobile)
        .eq('password_hash', hash)
        .single();
      if (error || !data) {
        return { success: false, message: 'login.err.invalid' };
      }
      if (!data.is_active) {
        return { success: false, message: 'login.err.inactive' };
      }
      Auth.setCurrentUser(data);
      // Update last_login
      supabaseClient.from('users').update({ last_login: new Date().toISOString() }).eq('id', data.id).then(()=>{});
      return { success: true, user: data };
    }
    // Demo fallback — check seeded admin
    const adminHash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'; // admin123
    if (mobile === '9000000000' && hash === adminHash) {
      const user = {
        id: 'admin-1', name: 'System Admin', mobile: '9000000000',
        role: 'admin', district: 'RAJASTHAN', is_active: true
      };
      Auth.setCurrentUser(user);
      return { success: true, user };
    }
    // Demo ASHA
    const ashaHash = await Auth.hashPassword('asha123');
    if (mobile === '9000000001' && hash === ashaHash) {
      const user = {
        id: 'u1', name: 'Sunita Devi', mobile: '9000000001',
        role: 'asha', district: 'Jodhpur', block: 'Osian', village: 'Khejarli', is_active: true
      };
      Auth.setCurrentUser(user);
      return { success: true, user };
    }
    return { success: false, message: 'login.err.invalid' };
  },

  async signup(formData) {
    // Validate
    if (!formData.name || !formData.mobile || !formData.password) {
      return { success: false, message: 'signup.err.required' };
    }
    if (!/^\d{10}$/.test(formData.mobile)) {
      return { success: false, message: 'signup.err.mobile' };
    }
    if (formData.password !== formData.confirm) {
      return { success: false, message: 'signup.err.pwmatch' };
    }
    if (formData.password.length < 6) {
      return { success: false, message: 'signup.err.required' };
    }
    const hash = await Auth.hashPassword(formData.password);
    const newUser = {
      name: formData.name,
      mobile: formData.mobile,
      password_hash: hash,
      role: 'asha',         // hardcoded — public cannot choose
      district: formData.district,
      block: formData.block,
      village: formData.village,
      is_active: false,     // pending approval
      created_at: new Date().toISOString()
    };
    if (DB.ready()) {
      // Check if exists
      const { data: existing } = await supabaseClient
        .from('users').select('id').eq('mobile', formData.mobile).maybeSingle();
      if (existing) return { success: false, message: 'signup.err.exists' };
      const { data, error } = await supabaseClient.from('users').insert(newUser).select().single();
      if (error) {
        if (error.code === '23505') return { success: false, message: 'signup.err.exists' };
        return { success: false, message: 'err.savefailed' };
      }
      logAudit('signup', 'users', data && data.id);
    } else {
      // Demo mode — pretend success
      console.log('[DEMO] Would create user:', { ...newUser, password_hash: '***' });
    }
    return { success: true };
  },

  setCurrentUser(user) {
    Auth.currentUser = user;
    sessionStorage.setItem('sw_user', JSON.stringify(user));
  },

  getCurrentUser() {
    if (Auth.currentUser) return Auth.currentUser;
    const stored = sessionStorage.getItem('sw_user');
    if (stored) {
      try { Auth.currentUser = JSON.parse(stored); } catch(e) {}
    }
    return Auth.currentUser;
  },

  logout() {
    Auth.currentUser = null;
    sessionStorage.removeItem('sw_user');
    window.location.href = 'login.html';
  },

  requireAuth(allowedRoles) {
    const user = Auth.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    if (allowedRoles && allowedRoles.length && allowedRoles.indexOf(user.role) === -1) {
      showToast('error', t('err.unauthorized'), '');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
      return null;
    }
    return user;
  },

  dashboardForRole(role) {
    // All roles go to dashboard except admin
    return role === 'admin' ? 'admin.html' : 'dashboard.html';
  }
};

window.Auth = Auth;
