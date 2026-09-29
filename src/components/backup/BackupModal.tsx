import React, { useState } from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { SaveBackupEntry } from '../../types/game';
import { 
  History, 
  X, 
  RotateCcw, 
  Coins, 
  Heart, 
  Clock, 
  PlusCircle, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Trash2
} from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const { backupsList, isBackingUp, createBackup, restoreFromBackup, deleteBackup } = useGameStore();
  const [selectedBackup, setSelectedBackup] = useState<SaveBackupEntry | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  
  // Trạng thái cho Dialog Xóa Backup
  const [backupToDelete, setBackupToDelete] = useState<SaveBackupEntry | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleManualBackup = async () => {
    const success = await createBackup('Sao lưu thủ công');
    if (success) {
      setNotification('Đã tạo bản sao lưu mới thành công!');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleExecuteRestore = async () => {
    if (!selectedBackup) return;
    await restoreFromBackup(selectedBackup);
    setConfirmRestore(false);
    setSelectedBackup(null);
    setNotification(`Đã khôi phục thành công về bản: ${selectedBackup.label}`);
    setTimeout(() => {
      setNotification(null);
      onClose();
    }, 1500);
  };

  const handleExecuteDelete = async () => {
    if (!backupToDelete) return;
    await deleteBackup(backupToDelete.id);
    setBackupToDelete(null);
    setNotification('Đã xóa bản sao lưu thành công!');
    setTimeout(() => setNotification(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/25 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white border border-rose-100 rounded-3xl shadow-xl shadow-rose-200/50 p-6 space-y-4 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-rose-50 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-800">Lịch Sử Sao Lưu (5 Phút)</h3>
            <p className="text-xs text-stone-400">Tự động sao lưu khi Online • Tối đa 5 bản gần nhất</p>
          </div>
        </div>

        {notification && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-2xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{notification}</span>
          </div>
        )}

        {/* HỘP THOẠI XÁC NHẬN KHÔI PHỤC */}
        {confirmRestore && selectedBackup && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                Khôi phục về bản <strong>{selectedBackup.label}</strong>? Dữ liệu chưa lưu hiện tại sẽ bị thay thế!
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setConfirmRestore(false)}
                className="px-3 py-1.5 bg-white border border-stone-200 text-stone-600 text-xs font-semibold rounded-xl hover:bg-stone-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteRestore}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                Xác nhận khôi phục
              </button>
            </div>
          </div>
        )}

        {/* HỘP THOẠI XÁC NHẬN XÓA BACKUP (YES / NO DIALOG) */}
        {backupToDelete && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800 leading-relaxed">
                Bạn có chắc chắn muốn xóa bản sao lưu <strong>{backupToDelete.label}</strong>? Thao tác này không thể hoàn tác!
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setBackupToDelete(null)}
                className="px-3 py-1.5 bg-white border border-stone-200 text-stone-600 text-xs font-semibold rounded-xl hover:bg-stone-50"
              >
                Không, giữ lại
              </button>
              <button
                onClick={handleExecuteDelete}
                className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleManualBackup}
          disabled={isBackingUp}
          className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50"
        >
          {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
          <span>Tạo Bản Sao Lưu Thủ Công Ngay</span>
        </button>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {backupsList.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-xs">
              Chưa có bản sao lưu nào. Hệ thống tự động tạo sau mỗi 5 phút chơi (khi Online)!
            </div>
          ) : (
            backupsList.map((entry) => {
              const date = new Date(entry.createdAt);
              const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              const dateStr = date.toLocaleDateString('vi-VN');

              return (
                <div
                  key={entry.id}
                  className="bg-stone-50/80 border border-stone-200/80 hover:border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-3 transition"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-800 truncate">{entry.label}</span>
                      <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.2 rounded font-bold">
                        Lv.{entry.data.level}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-stone-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeStr} ({dateStr})
                      </span>
                      <span className="flex items-center gap-0.5 text-amber-600 font-mono font-semibold">
                        <Coins className="w-3 h-3 text-amber-500" /> ${entry.data.cash.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-0.5 text-rose-500 font-mono font-semibold">
                        <Heart className="w-3 h-3 fill-rose-400 text-rose-400" /> {entry.data.hearts}
                      </span>
                    </div>
                  </div>

                  {/* NÚT THAO TÁC: NẠP LẠI & XÓA */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedBackup(entry);
                        setConfirmRestore(true);
                        setBackupToDelete(null);
                      }}
                      className="px-2.5 py-1.5 bg-white border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl shadow-2xs transition flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Nạp</span>
                    </button>

                    <button
                      onClick={() => {
                        setBackupToDelete(entry);
                        setConfirmRestore(false);
                      }}
                      className="p-1.5 bg-white border border-stone-200 hover:border-rose-300 hover:bg-rose-50 text-stone-400 hover:text-rose-600 rounded-xl transition"
                      title="Xóa bản sao lưu"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};