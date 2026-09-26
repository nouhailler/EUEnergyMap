import React from 'react';

interface UnitFormattedValueProps {
  value: number | null | undefined;
  unit: 'gCO2eq/kWh' | 'MW' | 'GW' | '%' | 'autoPower';
  fallbackText?: string;
  className?: string;
  showUnit?: boolean;
}

export const UnitFormattedValue: React.FC<UnitFormattedValueProps> = ({
  value,
  unit,
  fallbackText = '—',
  className = '',
  showUnit = true,
}) => {
  if (value === null || value === undefined || isNaN(value)) {
    return (
      <span className={`text-slate-400 font-normal italic ${className}`} title="Donnée indisponible">
        {fallbackText}
      </span>
    );
  }

  let displayValue = '';
  let displayUnit = '';

  if (unit === 'gCO2eq/kWh') {
    displayValue = value.toLocaleString('fr-FR');
    displayUnit = 'gCO₂eq/kWh';
  } else if (unit === '%') {
    displayValue = `${value.toLocaleString('fr-FR')}`;
    displayUnit = '%';
  } else if (unit === 'MW') {
    displayValue = value.toLocaleString('fr-FR');
    displayUnit = 'MW';
  } else if (unit === 'GW') {
    displayValue = (value / 1000).toLocaleString('fr-FR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    displayUnit = 'GW';
  } else if (unit === 'autoPower') {
    if (Math.abs(value) >= 1000) {
      displayValue = (value / 1000).toLocaleString('fr-FR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
      displayUnit = 'GW';
    } else {
      displayValue = value.toLocaleString('fr-FR');
      displayUnit = 'MW';
    }
  }

  return (
    <span className={className}>
      <span className="font-semibold">{displayValue}</span>
      {showUnit && <span className="ml-1 text-xs opacity-75 font-normal">{displayUnit}</span>}
    </span>
  );
};
