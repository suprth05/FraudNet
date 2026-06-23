import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Auth helpers
export const signUp = async (email, password, fullName) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    return { user: null, error };
  }
};

// Database helpers
export const getTransactions = async (page = 1, limit = 20, filters = {}) => {
  try {
    let query = supabase.from('transactions').select('*', { count: 'exact' });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.is_fraud !== undefined) {
      query = query.eq('is_fraud', filters.is_fraud);
    }
    if (filters.merchant_id) {
      query = query.eq('merchant_id', filters.merchant_id);
    }

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    query = query.order('created_at', { ascending: false }).range(start, end);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      transactions: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      error: null,
    };
  } catch (error) {
    return {
      transactions: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      error,
    };
  }
};

export const getTransaction = async (transactionId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error) throw error;
    return { transaction: data, error: null };
  } catch (error) {
    return { transaction: null, error };
  }
};

export const createTransaction = async (transactionData) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transactionData])
      .select()
      .single();

    if (error) throw error;
    return { transaction: data, error: null };
  } catch (error) {
    return { transaction: null, error };
  }
};

export const updateTransaction = async (transactionId, updates) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)
      .select()
      .single();

    if (error) throw error;
    return { transaction: data, error: null };
  } catch (error) {
    return { transaction: null, error };
  }
};

export const getMerchants = async (page = 1, limit = 20, filters = {}) => {
  try {
    let query = supabase.from('merchants').select('*', { count: 'exact' });

    if (filters.risk_level) {
      query = query.eq('risk_level', filters.risk_level);
    }

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    query = query.range(start, end);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      merchants: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      error: null,
    };
  } catch (error) {
    return {
      merchants: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      error,
    };
  }
};

export const getFraudAlerts = async (page = 1, limit = 20, filters = {}) => {
  try {
    let query = supabase.from('fraud_alerts').select('*', { count: 'exact' });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    query = query.order('created_at', { ascending: false }).range(start, end);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      alerts: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      error: null,
    };
  } catch (error) {
    return {
      alerts: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      error,
    };
  }
};

export const updateAlert = async (alertId, updates) => {
  try {
    const { data, error } = await supabase
      .from('fraud_alerts')
      .update(updates)
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    return { alert: data, error: null };
  } catch (error) {
    return { alert: null, error };
  }
};

export const getDashboardMetrics = async (days = 30) => {
  try {
    const { data, error } = await supabase
      .from('dashboard_metrics')
      .select('*')
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: true });

    if (error) throw error;
    return { metrics: data, error: null };
  } catch (error) {
    return { metrics: [], error };
  }
};
