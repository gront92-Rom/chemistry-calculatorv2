/*
Design: Retro-futuristic quick reference panel with chemical constants and physiology salts
*/

export default function QuickReference() {
  const constants = [
    { name: "Avogadro's Number", value: "6.022×10²³", unit: "mol⁻¹" },
    { name: "Gas Constant (R)", value: "8.314", unit: "J/(mol·K)" },
    { name: "Planck's Constant", value: "6.626×10⁻³⁴", unit: "J·s" },
    { name: "Speed of Light", value: "2.998×10⁸", unit: "m/s" },
  ];

  const commonElements = [
    { symbol: "H", name: "Hydrogen", mass: "1.008" },
    { symbol: "C", name: "Carbon", mass: "12.01" },
    { symbol: "N", name: "Nitrogen", mass: "14.01" },
    { symbol: "O", name: "Oxygen", mass: "16.00" },
  ];

  // Physiology salts with hydration states
  const physiologySalts = [
    { formula: "NaCl", name: "Sodium Chloride", mass: "58.44" },
    { formula: "KCl", name: "Potassium Chloride", mass: "74.55" },
    { formula: "CaCl₂", name: "Calcium Chloride", mass: "110.98" },
    { formula: "CaCl₂·2H₂O", name: "Calcium Chloride Dihydrate", mass: "147.01" },
    { formula: "MgSO₄", name: "Magnesium Sulfate", mass: "120.37" },
    { formula: "MgSO₄·7H₂O", name: "Magnesium Sulfate Heptahydrate", mass: "246.47" },
    { formula: "NaHCO₃", name: "Sodium Bicarbonate", mass: "84.01" },
    { formula: "Na₂HPO₄", name: "Disodium Phosphate", mass: "141.96" },
    { formula: "KH₂PO₄", name: "Monopotassium Phosphate", mass: "136.09" },
    { formula: "Glucose", name: "D-Glucose", mass: "180.16" },
    { formula: "NaH₂PO₄", name: "Monosodium Phosphate", mass: "119.98" },
    { formula: "MgCl₂", name: "Magnesium Chloride", mass: "95.21" },
  ];

  return (
    <div className="border-2 border-primary bg-card/80 backdrop-blur-sm p-6 scanlines">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-3 h-3 bg-primary rounded-full neon-glow" />
        <h2 className="text-xl font-bold text-primary tracking-wider">
          QUICK REFERENCE
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Physical Constants */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-primary tracking-widest border-b border-primary/30 pb-2">
            PHYSICAL CONSTANTS
          </h3>
          <div className="space-y-2">
            {constants.map((constant) => (
              <div
                key={constant.name}
                className="bg-primary/5 border border-primary/20 p-3 flex items-center justify-between"
              >
                <span className="text-xs text-muted-foreground">{constant.name}</span>
                <div className="text-right">
                  <span className="mono-display text-primary font-bold">{constant.value}</span>
                  <span className="text-xs text-muted-foreground ml-1">{constant.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Common Elements */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-primary tracking-widest border-b border-primary/30 pb-2">
            COMMON ELEMENTS (g/mol)
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {commonElements.map((element) => (
              <div
                key={element.symbol}
                className="bg-accent/10 border border-accent/30 p-2 text-center hover:border-accent transition-colors"
              >
                <div className="text-xl font-bold text-accent">{element.symbol}</div>
                <div className="text-[10px] text-muted-foreground truncate">{element.name}</div>
                <div className="text-xs mono-display text-primary font-bold mt-1">{element.mass}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Physiology Salts */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-terminal-green tracking-widest border-b border-terminal-green/30 pb-2"
            style={{
              textShadow: "0 0 5px var(--color-terminal-green)"
            }}
          >
            PHYSIOLOGY SALTS (g/mol)
          </h3>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {physiologySalts.map((salt) => (
              <div
                key={salt.formula}
                className="bg-terminal-green/5 border border-terminal-green/20 p-2 hover:border-terminal-green/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-terminal-green">{salt.formula}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{salt.name}</div>
                  </div>
                  <div className="text-sm mono-display text-primary font-bold ml-2">{salt.mass}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="mt-6 pt-4 border-t border-primary/30 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-terminal-green rounded-full animate-pulse" />
            <span className="text-muted-foreground">SYSTEM STATUS: OPERATIONAL</span>
          </div>
        </div>
        <div className="text-muted-foreground mono-display">
          v2.0.0 | RETRO-CALC-84
        </div>
      </div>
    </div>
  );
}
