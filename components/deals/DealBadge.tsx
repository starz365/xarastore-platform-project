interface DealBadgeProps {
  type: 'flash' | 'today' | 'top-rated' | 'new';
  className?: string;
}

export function DealBadge({ type, className = '' }: DealBadgeProps) {
  const config = {
    flash: {
      label: 'FLASH',
      color: 'bg-orange-500 text-white',
      icon: '⚡',
    },
    today: {
      label: 'TODAY',
      color: 'bg-blue-500 text-white',
      icon: '📅',
    },
    'top-rated': {
      label: 'TOP RATED',
      color: 'bg-yellow-500 text-white',
      icon: '⭐',
    },
    new: {
      label: 'NEW',
      color: 'bg-green-500 text-white',
      icon: '🆕',
    },
  };

  const { label, color, icon } = config[type];

  return (
    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-bold ${color} ${className}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}
