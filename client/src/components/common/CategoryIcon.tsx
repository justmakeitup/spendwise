import React from 'react';
import * as Icons from 'lucide-react';

interface CategoryIconProps {
  iconName: string;
  color?: string;
  className?: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  iconName,
  color,
  className = 'w-4 h-4',
  size = 18
}) => {
  // @ts-ignore
  const IconComponent = (Icons as any)[iconName] || Icons.CircleDollarSign;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl p-2 shrink-0 ${className}`}
      style={{
        backgroundColor: color ? `${color}20` : 'rgba(255, 255, 255, 0.08)',
        color: color || '#10B981'
      }}
    >
      <IconComponent size={size} />
    </div>
  );
};
