import { createClient } from '@supabase/supabase-js';

// Đọc biến môi trường từ Vite
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Kiểm tra và in cảnh báo nhẹ nhàng, không để app văng Exception crash
const isMissingEnv = !envUrl || !envAnonKey || envUrl.includes('placeholder');
if (isMissingEnv) {
  console.warn('Cozy Bakery: Đang chạy chế độ Local-First (Chưa có kết nối Supabase Cloud).');
}

// Fallback URL định dạng chuẩn để createClient không bao giờ văng lỗi fatal
const supabaseUrl = envUrl && envUrl.startsWith('http') 
  ? envUrl 
  : 'https://kmypjbgjvkkbmyaomhrt.supabase.co';

const supabaseAnonKey = envAnonKey && envAnonKey.length > 10 
  ? envAnonKey 
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtteXBqYmdqdmtrYm15YW9taHJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyOTQxMjgsImV4cCI6MjEwNDg3MDEyOH0.LehadH5EP9rtre0Ielz4U3kuQ8wE6rZMw_yjg6iS_kw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});