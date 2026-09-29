import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { AssetSource, RarityType } from '../../types/game';
import { RARITY_STYLES } from '../../utils/rarity';

interface GameItemIconProps {
  asset: AssetSource;
  rarity?: RarityType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const GameItemIcon: React.FC<GameItemIconProps> = ({
  asset,
  rarity = 'common',
  size = 'md',
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);

  const containerSizes = {
    sm: 'w-8 h-8 p-1 rounded-xl',
    md: 'w-12 h-12 p-2 rounded-2xl',
    lg: 'w-16 h-16 p-2.5 rounded-3xl',
    xl: 'w-20 h-20 p-3 rounded-3xl'
  };

  const iconSizes = { sm: 16, md: 24, lg: 32, xl: 40 };
  const style = RARITY_STYLES[rarity] || RARITY_STYLES.common;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 border transition-all ${style.border} ${style.bg} ${containerSizes[size]} ${className}`}
    >
      {asset.type === 'lucide' || imageError ? (
        (() => {
          const iconName = asset.type === 'lucide' ? asset.iconName : 'Cake';
          const LucideComp = (Icons as Record<string, any>)[iconName] || Icons.Package;
          return <LucideComp size={iconSizes[size]} className={style.text} strokeWidth={2} />;
        })()
      ) : (
        <img
          src={asset.src}
          alt={asset.alt || 'item'}
          onError={() => setImageError(true)}
          className="w-full h-full object-contain pointer-events-none select-none transition-transform hover:scale-110 duration-200"
          loading="lazy"
        />
      )}
    </div>
  );
};