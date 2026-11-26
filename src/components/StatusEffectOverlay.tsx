import React from 'react';
import type { StatusCondition } from '../data/types';

interface StatusEffectOverlayProps {
  status: StatusCondition;
  cured?: boolean;
}

/**
 * Renders unmistakable, animated Pokémon status effects directly over sick patients
 * in Nurse Joy's Pokémon Center Clinic so a 5-year-old can visually diagnose
 * Burn (BRN), Freeze (FRZ), Paralysis (PAR), Poison (PSN), Sleep (SLP), or Low HP!
 */
export const StatusEffectOverlay: React.FC<StatusEffectOverlayProps> = ({
  status,
  cured = false,
}) => {
  if (cured) return null;

  if (status === 'BRN') {
    return (
      <div className="status-fx status-fx--brn" aria-hidden="true" data-testid="status-fx-BRN">
        <span className="fx-flame fx-flame--1" />
        <span className="fx-flame fx-flame--2" />
        <span className="fx-flame fx-flame--3" />
      </div>
    );
  }

  if (status === 'FRZ') {
    return (
      <div className="status-fx status-fx--frz" aria-hidden="true" data-testid="status-fx-FRZ">
        <div className="fx-ice-crystal" />
        <span className="fx-snow fx-snow--1">❄</span>
        <span className="fx-snow fx-snow--2">❄</span>
        <span className="fx-snow fx-snow--3">❄</span>
      </div>
    );
  }

  if (status === 'PAR') {
    return (
      <div className="status-fx status-fx--par" aria-hidden="true" data-testid="status-fx-PAR">
        <svg className="fx-bolt fx-bolt--1" width="32" height="32" viewBox="0 0 24 24" fill="#FDE047" stroke="#CA8A04" strokeWidth="1.3">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <svg className="fx-bolt fx-bolt--2" width="26" height="26" viewBox="0 0 24 24" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1.3">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <svg className="fx-bolt fx-bolt--3" width="22" height="22" viewBox="0 0 24 24" fill="#FACC15" stroke="#A16207" strokeWidth="1.3">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </div>
    );
  }

  if (status === 'PSN') {
    return (
      <div className="status-fx status-fx--psn" aria-hidden="true" data-testid="status-fx-PSN">
        <span className="fx-poison-bubble fx-poison-bubble--1" />
        <span className="fx-poison-bubble fx-poison-bubble--2" />
        <span className="fx-poison-bubble fx-poison-bubble--3" />
        <span className="fx-poison-bubble fx-poison-bubble--4" />
      </div>
    );
  }

  if (status === 'SLP') {
    return (
      <div className="status-fx status-fx--slp" aria-hidden="true" data-testid="status-fx-SLP">
        <span className="fx-zzz fx-zzz--1">Z</span>
        <span className="fx-zzz fx-zzz--2">z</span>
        <span className="fx-zzz fx-zzz--3">z</span>
      </div>
    );
  }

  // HP / Tired care badge
  return (
    <div className="status-fx status-fx--hp" aria-hidden="true" data-testid="status-fx-HP">
      <div className="fx-bandage">
        <span className="fx-bandage__pad" />
      </div>
    </div>
  );
};
