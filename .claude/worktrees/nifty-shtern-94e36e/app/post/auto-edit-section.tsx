import { useState } from 'react';
import { Wand2, Sparkles, Loader2, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface AutoEditSectionProps {
  isPro: boolean;
  isProcessing: boolean;
  onAutoEdit: (editType: string) => Promise<void>;
}

export function AutoEditSection({ isPro, isProcessing, onAutoEdit }: AutoEditSectionProps) {
  const [selectedEditType, setSelectedEditType] = useState<'minimal' | 'balanced' | 'aggressive'>('balanced');
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyAutoEdit = async () => {
    setIsApplying(true);
    try {
      await onAutoEdit(selectedEditType);
    } finally {
      setIsApplying(false);
    }
  };

  if (!isPro) {
    return (
      <div className="p-4 bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg border border-purple-500/30">
        <p className="text-sm text-gray-300">
          🔒 自動編集ツールは PRO 会員限定です
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Wand2 className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">自動編集ツール</h3>
      </div>

      {/* 編集タイプ選択 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { id: 'minimal', label: 'ミニマル', desc: '基本的な調整' },
          { id: 'balanced', label: 'バランス', desc: '推奨設定' },
          { id: 'aggressive', label: 'アグレッシブ', desc: '派手な編集' }
        ].map(type => (
          <button
            key={type.id}
            onClick={() => setSelectedEditType(type.id as any)}
            className={`p-3 rounded-lg border-2 transition-all ${
              selectedEditType === type.id
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-gray-600 bg-gray-900/50 hover:border-gray-500'
            }`}
          >
            <div className="text-sm font-semibold text-white">{type.label}</div>
            <div className="text-xs text-gray-400">{type.desc}</div>
          </button>
        ))}
      </div>

      {/* 自動編集機能リスト */}
      <div className="bg-gray-900/50 rounded-lg p-4 space-y-2">
        {[
          '✨ 自動字幕生成',
          '🎬 自動トランジション',
          '🎨 自動色補正',
          '✂️ 自動トリミング',
          '🔊 自動音量調整'
        ].map((feature, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
            <Check className="w-4 h-4 text-green-400" />
            {feature}
          </div>
        ))}
      </div>

      {/* 適用ボタン */}
      <button
        onClick={handleApplyAutoEdit}
        disabled={isApplying || isProcessing}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all"
      >
        {isApplying || isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            処理中...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            自動編集を適用
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        処理時間: 2-5分
      </p>
    </motion.div>
  );
}
