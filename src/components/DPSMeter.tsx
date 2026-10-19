import React, { useState } from 'react';

export type MetricType = 'DAMAGE' | 'HEALING' | 'SHIELD';

export interface UnitMetric {
  id: string;
  name: string;
  icon?: string;
  damage: number;
  healing: number;
  shield: number;
}

interface DPSMeterProps {
  metrics?: UnitMetric[];
}

export const DPSMeter: React.FC<DPSMeterProps> = ({ metrics = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MetricType>('DAMAGE');

  const maxVal = Math.max(
    1,
    ...metrics.map((m) =>
      activeTab === 'DAMAGE' ? m.damage : activeTab === 'HEALING' ? m.healing : m.shield
    )
  );

  return (
    <aside className={`dps-meter-drawer ${isOpen ? 'open' : 'closed'}`}>
      {/* TOGGLE TAB HANDLE ON THE LEFT OF THE DRAWER */}
      <button
        className="dps-drawer-toggle-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Estadísticas de combate"
      >
        <span className="toggle-icon">{isOpen ? '▶' : '◀'}</span>
        <span className="toggle-label">⚔️ Daño</span>
      </button>

      {/* DRAWER BODY */}
      <div className="dps-drawer-body">
        <div className="dps-drawer-header">
          <div className="dps-tabs">
            <button
              className={`dps-tab ${activeTab === 'DAMAGE' ? 'active' : ''}`}
              onClick={() => setActiveTab('DAMAGE')}
            >
              ⚔️ Daño
            </button>
            <button
              className={`dps-tab ${activeTab === 'HEALING' ? 'active' : ''}`}
              onClick={() => setActiveTab('HEALING')}
            >
              💚 Cura
            </button>
            <button
              className={`dps-tab ${activeTab === 'SHIELD' ? 'active' : ''}`}
              onClick={() => setActiveTab('SHIELD')}
            >
              🛡️ Bloq
            </button>
          </div>
          <button className="dps-close-btn" onClick={() => setIsOpen(false)}>✕</button>
        </div>

        {/* METRICS LIST */}
        <div className="dps-units-list">
          {metrics.length === 0 ? (
            <div className="dps-empty-state">
              <span className="empty-icon">⚔️</span>
              <p>Esperando combate...</p>
              <small>El daño de las unidades aparecerá aquí durante la ronda</small>
            </div>
          ) : (
            metrics.map((unit) => {
              const val =
                activeTab === 'DAMAGE'
                  ? unit.damage
                  : activeTab === 'HEALING'
                  ? unit.healing
                  : unit.shield;
              const percent = Math.min(100, Math.round((val / maxVal) * 100));

              return (
                <div key={unit.id} className="dps-unit-row">
                  <div className="dps-unit-avatar">
                    {unit.icon ? (
                      <img src={unit.icon} alt={unit.name} />
                    ) : (
                      <span>🛡️</span>
                    )}
                  </div>
                  <div className="dps-unit-bar-wrapper">
                    <div className="dps-unit-info">
                      <span className="unit-name">{unit.name}</span>
                      <span className="unit-val">{val.toLocaleString()}</span>
                    </div>
                    <div className="dps-progress-track">
                      <div
                        className={`dps-progress-fill ${activeTab.toLowerCase()}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};
