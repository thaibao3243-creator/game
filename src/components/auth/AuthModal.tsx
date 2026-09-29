import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { useGameStore } from '../../stores/useGameStore';
import { Sparkles, X, Heart, Mail, Lock, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { setCurrentUser, loadFromCloud, syncToCloud } = useGameStore();

  if (!isOpen) return null;

  // Xử lý Đăng nhập Google an toàn chống kẹt session
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      // 1. Dọn sạch session lỗi cũ còn sót lại trên client
      await supabase.auth.signOut().catch(() => {});

      // 2. Gọi xác thực OAuth với tham số ép Google hiển thị hộp thoại chọn tài khoản
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account', // Bắt buộc Google cấp quyền tài khoản mới
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể kết nối đến Google, vui lòng thử lại!');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      if (isLoginMode) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          setCurrentUser(data.user);
          await loadFromCloud();
          onClose();
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          setCurrentUser(data.user);
          await syncToCloud();
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Đã có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/25 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-white border border-rose-100 rounded-3xl shadow-xl shadow-rose-200/40 p-6 space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-rose-50 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-100 text-rose-500 mb-1">
            <Heart className="w-6 h-6 fill-rose-400 text-rose-400" />
          </div>
          <h3 className="text-lg font-bold text-stone-800">
            {isLoginMode ? 'Chào Bạn Trở Lại!' : 'Tạo Tiệm Nhỏ Của Bạn'}
          </h3>
          <p className="text-xs text-stone-400">Đăng nhập để đồng bộ tiến trình an toàn.</p>
        </div>

        {errorMessage && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl">
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-white border border-stone-200 hover:bg-stone-50 active:scale-98 text-stone-700 text-xs font-semibold rounded-2xl shadow-sm transition flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Tiếp tục với Google</span>
        </button>

        <div className="relative flex items-center justify-center my-2">
          <div className="border-t border-stone-200 w-full"></div>
          <span className="bg-white px-2 text-[11px] text-stone-400 uppercase tracking-wider shrink-0">
            hoặc Email
          </span>
          <div className="border-t border-stone-200 w-full"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-600 ml-1">Email</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-4 h-4 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tenban@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-800 focus:outline-none focus:border-rose-400 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-600 ml-1">Mật khẩu</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-stone-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-800 focus:outline-none focus:border-rose-400 focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1 py-3 bg-rose-400 hover:bg-rose-500 active:scale-95 text-white font-medium text-xs rounded-2xl shadow-md shadow-rose-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isLoginMode ? 'Đăng Nhập' : 'Tạo Tài Khoản'}
          </button>
        </form>

        <div className="text-center pt-1 border-t border-stone-100">
          <button
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setErrorMessage('');
            }}
            className="text-xs text-rose-500 font-medium hover:underline"
          >
            {isLoginMode ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  );
};